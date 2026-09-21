import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import AttendanceSetting from "../models/AttendanceSetting.js";
import AttendanceCorrection from "../models/AttendanceCorrection.js";
import getAttendanceStatus from "../utils/getAttendanceStatus.js";
import calculateWorkingHours from "../utils/calculateWorkingHours.js";
import calculateOvertime from "../utils/calculateOvertime.js";
import formatDateTime from "../utils/formatDateTime.js";
import { verifyOfficeGeofence } from "../utils/geofence.js";

/**
 * Helper to detect incomplete previous-day attendance for an employee.
 * Finds any past attendance record where checkIn exists but checkOut is null/missing.
 */
export const findIncompletePreviousAttendance = async (employeeId, startOfToday) => {
  try {
    // Find past incomplete attendances where checkIn exists but checkOut is null/missing
    const incompleteRecords = await Attendance.find({
      employee: employeeId,
      attendanceDate: { $lt: startOfToday },
      "checkIn.time": { $exists: true, $ne: null },
      $or: [{ "checkOut.time": null }, { "checkOut.time": { $exists: false } }],
    })
      .sort({ attendanceDate: -1 })
      .lean();

    if (!incompleteRecords || incompleteRecords.length === 0) return null;

    for (const incomplete of incompleteRecords) {
      // If the attendance already has hasPendingCorrection flag, skip warning
      if (incomplete.hasPendingCorrection) {
        continue;
      }

      // Check if there is an active Pending correction request for this attendance
      const pendingCorrection = await AttendanceCorrection.findOne({
        attendance: incomplete._id,
        status: "Pending",
      }).lean();

      if (pendingCorrection) {
        continue;
      }

      const d = new Date(incomplete.attendanceDate);
      const dateFormatted = d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      return {
        attendanceId: incomplete._id,
        attendanceDate: incomplete.attendanceDate,
        dateFormatted,
        checkInTime: incomplete.checkIn?.time,
        hasPendingCorrection: false,
        pendingCorrectionId: null,
        warningMessage: `You didn’t check out on ${dateFormatted}. Please submit a correction request.`,
      };
    }

    return null;
  } catch (err) {
    console.error("Error finding incomplete previous attendance:", err);
    return null;
  }
};

//! GET LOGGED-IN EMPLOYEE'S TODAY ATTENDANCE API
export const getMyTodayAttendance = async (req, res) => {
  try {
    const employee = await User.findById(req.user._id).select("-password");
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [attendance, incompletePrevious] = await Promise.all([
      Attendance.findOne({
        employee: employee._id,
        attendanceDate: { $gte: startOfToday, $lte: endOfToday },
      }).lean(),
      findIncompletePreviousAttendance(employee._id, startOfToday),
    ]);

    return res.status(200).json({
      success: true,
      message: "Today's attendance fetched successfully.",
      data: attendance || null,
      isCheckedIn: Boolean(attendance?.checkIn?.time),
      isCheckedOut: Boolean(attendance?.checkOut?.time),
      incompletePreviousAttendance: incompletePrevious || null,
      warning: incompletePrevious?.warningMessage || null,
    });
  } catch (error) {
    console.error("Get Today Attendance Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

//! CHECK-IN API
export const checkIn = async (req, res) => {
  try {
    // Validation (Get Logged In Employee)
    const employee = await User.findById(req.user._id).select("-password");
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }
    // Employee Active Check
    if (employee.status !== "Active") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact Admin.",
      });
    }
    // Photo Validation
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Selfie photo is required.",
      });
    }

    const { latitude, longitude, accuracy, address } = req.body;
    // Latitude Validation
    if (latitude === undefined || latitude === null) {
      return res.status(400).json({
        success: false,
        message: "Latitude is required.",
      });
    }
    // Longitude Validation
    if (longitude === undefined || longitude === null) {
      return res.status(400).json({
        success: false,
        message: "Longitude is required.",
      });
    }
    const lat = Number(latitude);
    const lng = Number(longitude);
    const acc =
      accuracy !== undefined && accuracy !== null && !isNaN(Number(accuracy))
        ? Number(accuracy)
        : null;

    if (
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid GPS coordinates.",
      });
    }

    // Geofence Validation against assigned/selected office: validate accuracy first, then distance
    const branchName = employee.branch || "Main Office";
    const geofence = await verifyOfficeGeofence(branchName, lat, lng, acc);
    if (!geofence.isValid) {
      if (geofence.isAccuracyTooLow) {
        return res.status(400).json({
          success: false,
          code: "GPS_ACCURACY_TOO_LOW",
          message: geofence.message,
          accuracy: geofence.accuracy,
          maxAllowedAccuracy: geofence.maxAllowedAccuracy,
        });
      }
      return res.status(403).json({
        success: false,
        code: "OUTSIDE_GEOFENCE",
        message: geofence.message,
        distance: geofence.distance,
        allowedRadius: geofence.allowedRadius,
        branch: geofence.branchName,
      });
    }

    const formattedAddress = address?.trim() || "";

    // Duplicate Check using full-day boundary
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const alreadyCheckedIn = await Attendance.findOne({
      employee: employee._id,
      attendanceDate: { $gte: startOfToday, $lte: endOfToday },
    });

    if (alreadyCheckedIn) {
      return res.status(409).json({
        success: false,
        message: "You have already checked in today. Please check out instead.",
        action: "CHECK_OUT",
        data: alreadyCheckedIn,
      });
    }

    const checkInTime = new Date();

    const photoPath = req.file.path.replace(/\\/g, "/");
    const ipAddress =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress ||
      req.ip;
    // Attendance Status
    const { attendanceStatus, isLate } = getAttendanceStatus(
      employee.shift,
      checkInTime,
    );
    // Save Attendance
    const device = req.headers["user-agent"] || "Unknown Device";
    const attendance = await Attendance.create({
      employee: employee._id,
      attendanceDate: startOfToday,
      checkIn: {
        time: checkInTime,
        location: {
          latitude: lat,
          longitude: lng,
          accuracy: acc,
          address: formattedAddress,
        },
        photo: photoPath,
        device,
        ipAddress,
      },
      workingHours: 0,
      overtimeHours: 0,
      shift: employee.shift,
      attendanceStatus,
      isLate,
    });
    const incompletePrevious = await findIncompletePreviousAttendance(
      employee._id,
      startOfToday
    );

    return res.status(201).json({
      success: true,
      message: "Check-in successful.",
      data: {
        attendanceId: attendance._id,
        employeeId: employee.employeeId,
        employeeName: employee.name,
        attendanceDate: attendance.attendanceDate,
        checkInTime: attendance.checkIn.time,
        attendanceStatus: attendance.attendanceStatus,
        isLate: attendance.isLate,
        shift: attendance.shift,
        workingHours: attendance.workingHours,
        location: attendance.checkIn.location,
      },
      incompletePreviousAttendance: incompletePrevious || null,
      warning: incompletePrevious?.warningMessage || null,
    });
  } catch (error) {
    console.error("Check-In Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

//! CHECK-OUT API
export const checkOut = async (req, res) => {
  try {
    // ===========================================
    // Get Logged In Employee
    // ===========================================

    const employee = await User.findById(req.user._id).select("-password");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    // ===========================================
    // Employee Active Check
    // ===========================================

    if (employee.status !== "Active") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact Admin.",
      });
    }

    // ===========================================
    // Selfie Validation
    // ===========================================

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Checkout selfie is required.",
      });
    }

    // ===========================================
    // GPS Validation
    // ===========================================

    const { latitude, longitude, accuracy, address } = req.body;

    if (latitude === undefined || latitude === null) {
      return res.status(400).json({
        success: false,
        message: "Latitude is required.",
      });
    }

    if (longitude === undefined || longitude === null) {
      return res.status(400).json({
        success: false,
        message: "Longitude is required.",
      });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);
    const acc =
      accuracy !== undefined && accuracy !== null && !isNaN(Number(accuracy))
        ? Number(accuracy)
        : null;

    if (
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid GPS coordinates.",
      });
    }

    // Geofence Validation against assigned/selected office: validate accuracy first, then distance
    const branchName = employee.branch || "Main Office";
    const geofence = await verifyOfficeGeofence(branchName, lat, lng, acc);
    if (!geofence.isValid) {
      if (geofence.isAccuracyTooLow) {
        return res.status(400).json({
          success: false,
          code: "GPS_ACCURACY_TOO_LOW",
          message: geofence.message,
          accuracy: geofence.accuracy,
          maxAllowedAccuracy: geofence.maxAllowedAccuracy,
        });
      }
      return res.status(403).json({
        success: false,
        code: "OUTSIDE_GEOFENCE",
        message: geofence.message,
        distance: geofence.distance,
        allowedRadius: geofence.allowedRadius,
        branch: geofence.branchName,
      });
    }

    // ===========================================
    // Common Variables
    // ===========================================

    const formattedAddress = address?.trim() || "";

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const checkOutTime = new Date();

    const photoPath = req.file.path.replace(/\\/g, "/");

    const device = req.headers["user-agent"] || "Unknown Device";

    const ipAddress =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress ||
      req.ip;
    // ===========================================
    // Find Today's Attendance
    // ===========================================

    const attendance = await Attendance.findOne({
      employee: employee._id,
      attendanceDate: { $gte: startOfToday, $lte: endOfToday },
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "No check-in record found for today. Please check in first.",
        action: "CHECK_IN",
      });
    }

    // ===========================================
    // Check-In Validation
    // ===========================================

    if (!attendance.checkIn?.time) {
      return res.status(400).json({
        success: false,
        message: "Check-in is not completed.",
        action: "CHECK_IN",
      });
    }

    // ===========================================
    // Prevent Double Check-Out
    // ===========================================

    if (attendance.checkOut?.time) {
      return res.status(409).json({
        success: false,
        message: "You have already checked out today.",
        action: "COMPLETED",
        data: attendance,
      });
    }

    // ===========================================
    // Calculate Working Hours & Overtime
    // ===========================================

    const workingHours = calculateWorkingHours(
      attendance.checkIn.time,
      checkOutTime,
    );

    const overtimeHours = calculateOvertime(workingHours);

    // ===========================================
    // Update Check-Out Details
    // ===========================================

    attendance.checkOut = {
      time: checkOutTime,

      location: {
        latitude: lat,
        longitude: lng,
        accuracy: acc,
        address: formattedAddress,
      },

      photo: photoPath,

      device,

      ipAddress,
    };

    // ===========================================
    // Update Working Hours
    // ===========================================

    attendance.workingHours = workingHours;

    attendance.overtimeHours = overtimeHours;

    // ===========================================
    // Save Attendance
    // ===========================================

    await attendance.save();

    // ===========================================
    // Response
    // ===========================================

    return res.status(200).json({
      success: true,
      message: "Check-out successful.",

      data: {
        attendanceId: attendance._id,

        employeeId: employee.employeeId,

        employeeName: employee.name,

        attendanceDate: attendance.attendanceDate,

        checkInTime: attendance.checkIn.time,

        checkOutTime: attendance.checkOut.time,

        workingHours: attendance.workingHours,

        overtimeHours: attendance.overtimeHours,

        attendanceStatus: attendance.attendanceStatus,

        location: attendance.checkOut.location,
      },
    });
  } catch (error) {
    console.error("Check-Out Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
// Audit Logs Transactions Concurrent Updates Multi Admin Editing -findOneAndUpdate()

//! GET ATTENDANCE HISTORY API(summary calculation ko aggregation pipeline me upgrade karenge-After Admin Attendance Reports aur Dashboard Analytic)
//! ?month=7&year=2026&startDate=2026-07-05&endDate=2026-07-20 - improvement for multiple filtering option...should be able to filter by month/year or by date range or by status or by sorting order
export const getAttendanceHistory = async (req, res) => {
  try {
    const employee = await User.findById(req.user._id).select("-password");
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }
    // Query Parameters
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const month = req.query.month;
    const year = req.query.year;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const status = req.query.status;
    const sort = req.query.sort || "latest";
    // Skip Records
    const skip = (page - 1) * limit;
    // Base Filter
    const filter = {
      employee: employee._id,
    };
    // Month & Year Filter
    if (month && year) {
      const fromDate = new Date(Number(year), Number(month) - 1, 1);
      const toDate = new Date(Number(year), Number(month), 1);
      filter.attendanceDate = {
        $gte: fromDate,
        $lt: toDate,
      };
    }
    // Date Range Filter
    if (startDate && endDate) {
      filter.attendanceDate = {
        $gte: new Date(startDate),
        $lte: new Date(`${endDate}T23:59:59.999Z`),
      };
    }
    // Attendance Status Filter
    if (status) {
      filter.attendanceStatus = status;
    }
    // Sorting
    const allowedSort = ["latest", "oldest"];
    const sortBy = allowedSort.includes(sort) ? sort : "latest";
    const sortOption =
      sortBy === "oldest" ? { attendanceDate: 1 } : { attendanceDate: -1 };
//Multiple Queries in Parallel using Promise.all() for better performance 
    const [
    totalRecords,
    attendanceHistory,
    summaryData
] = await Promise.all([
    Attendance.countDocuments(filter),
    Attendance.find(filter)
        .select(
            "attendanceDate checkIn checkOut attendanceStatus workingHours overtimeHours shift"
        )
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
    Attendance.find(filter)
        .select("attendanceStatus workingHours overtimeHours")
        .lean()
]);
// Summary
const summary = {
    presentDays: 0,
    lateDays: 0,
    halfDays: 0,
    leaveDays: 0,
    totalWorkingHours: 0,
    totalOvertimeHours: 0,
};
summaryData.forEach((attendance) => {
    switch (attendance.attendanceStatus) {
        case "Present":
            summary.presentDays++;
            break;
        case "Late":
            summary.lateDays++;
            break;
        case "Half Day":
            summary.halfDays++;
            break;
        case "Leave":
            summary.leaveDays++;
            break;
        default:
            break;
    }
    summary.totalWorkingHours += attendance.workingHours || 0;
    summary.totalOvertimeHours += attendance.overtimeHours || 0;
});
//Decimal value fixed up to 2 decimal places
summary.totalWorkingHours =
Number(summary.totalWorkingHours.toFixed(2));
summary.totalOvertimeHours =
Number(summary.totalOvertimeHours.toFixed(2));
    // Pagination
    const totalPages = Math.ceil(totalRecords / limit);
   return res.status(200).json({
    success: true,
    message: "Attendance history fetched successfully.",
    summary,
    pagination: {
        currentPage: page,
        totalPages,
        totalRecords,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
    },
    data: attendanceHistory,
});
  } catch (error) {
    console.error("Get Attendance History Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
};

//! Admin Attendance Reports API (Admin & Branch Admin)
export const getAdminAttendanceReport = async (req, res) => {
    try {
        const caller = await User.findById(req.user._id);
        if (!caller) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }
        const isCallerAdmin = caller.role === "Admin";
        const isCallerBranchAdmin =
            caller.role === "Branch Admin" ||
            caller.role === "Branch Manager" ||
            (caller.role !== "Admin" && /^\s*branch\s*(admin|man?ager)\s*$/i.test(caller.designation || ""));

        if (!isCallerAdmin && !isCallerBranchAdmin) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only Admins and Branch Admins can view attendance reports."
            });
        }
        // Query Parameters
        const page = Math.max(Number(req.query.page) || 1, 1);
        const limit = Math.min(
            Math.max(Number(req.query.limit) || 10, 1),
            100
        );
        const employee = req.query.employee;
        const month = req.query.month;
        const year = req.query.year;
        const startDate = req.query.startDate
        const endDate = req.query.endDate;
        const status = req.query.status;
        const search = req.query.search?.trim();
        const sort = req.query.sort || "latest";
        const skip = (page - 1) * limit;

        // Branch scoping
        let inScopeEmployeeIds = null;
        if (!isCallerAdmin && isCallerBranchAdmin) {
            const branchName = caller.branch || "Santoshpur Branch";
            const branchEmployees = await User.find({ branch: branchName }).select("_id");
            inScopeEmployeeIds = branchEmployees.map((e) => e._id.toString());

            if (employee && !inScopeEmployeeIds.includes(employee.toString())) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied. You can only view attendance records for employees in ${branchName}.`
                });
            }
        }

        // Base Filter
        const filter = {};
        if (employee) {
            filter.employee = employee;
        } else if (inScopeEmployeeIds !== null) {
            filter.employee = { $in: inScopeEmployeeIds };
        }

        // Search Employee
        if (search) {
            const searchFilter = {
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { employeeId: { $regex: search, $options: "i" } }
                ]
            };
            if (!isCallerAdmin && isCallerBranchAdmin) {
                searchFilter.branch = caller.branch || "Santoshpur Branch";
            }
            const employees = await User.find(searchFilter).select("_id");
            const matchingSearchIds = employees.map((emp) => emp._id.toString());
            if (inScopeEmployeeIds !== null) {
                filter.employee = {
                    $in: matchingSearchIds.filter((id) => inScopeEmployeeIds.includes(id))
                };
            } else {
                filter.employee = { $in: matchingSearchIds };
            }
        }
// Month & Year Filter
if (month && year) {
    const fromDate = new Date(
        Number(year),
        Number(month) - 1,
        1
    );
    const toDate = new Date(
        Number(year),
        Number(month),
        1
    );
    filter.attendanceDate = {
        $gte: fromDate,
        $lt: toDate,
    };
}
// Date Range Filter
if (startDate && endDate) {
    filter.attendanceDate = {
        $gte: new Date(startDate),
        $lte: new Date(`${endDate}T23:59:59.999Z`)
    };
}
// Attendance Status Filter
if (status) {
    filter.attendanceStatus = status;
}
// -------------------------
// Sorting
// -------------------------
const allowedSort = ["latest", "oldest"];
const sortBy = allowedSort.includes(sort)
    ? sort
    : "latest";
const sortOption =
    sortBy === "oldest"
        ? { attendanceDate: 1 }
        : { attendanceDate: -1 };
// Total Records
const totalRecords = await Attendance.countDocuments(filter);
// Attendance Report
const attendanceReport = await Attendance.find(filter)
    .populate({
        path: "employee",
        select: "employeeId name email department designation"
    })
    .select(
        "attendanceDate checkIn checkOut attendanceStatus workingHours overtimeHours shift employee"
    )
    .sort(sortOption)
    .skip(skip)
    .limit(limit)
    .lean();
// Pagination
const totalPages = Math.ceil(totalRecords / limit);  
// Attendance Summary Data
const summaryData = await Attendance.find(filter)
    .select("attendanceStatus workingHours overtimeHours")
    .lean();
// Summary
const summary = {
    presentDays: 0,
    lateDays: 0,
    halfDays: 0,
    leaveDays: 0,
    totalWorkingHours: 0,
    totalOvertimeHours: 0
};
summaryData.forEach((attendance) => {
    switch (attendance.attendanceStatus) {
        case "Present":
            summary.presentDays++;
            break;
        case "Late":
            summary.lateDays++;
            break;
        case "Half Day":
            summary.halfDays++;
            break;
        case "Leave":
            summary.leaveDays++;
            break;
        default:
            break;
    }
    summary.totalWorkingHours += Number(attendance.workingHours || 0);
    summary.totalOvertimeHours += Number(attendance.overtimeHours || 0);
});
summary.totalWorkingHours = Number(
    summary.totalWorkingHours.toFixed(2)
);
summary.totalOvertimeHours = Number(
    summary.totalOvertimeHours.toFixed(2)
);
        return res.status(200).json({
            success: true,
            message: "Attendance report fetched successfully.",  
            summary,           
            pagination: {
        currentPage: page,
        totalPages,
        totalRecords,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
    },
    data: attendanceReport
        });
    } catch (error) {
        console.error("Admin Attendance Report Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error."
        });
    }
};

//! GET ATTENDANCE SETTINGS API
export const getAttendanceSettings = async (req, res) => {
  try {
    let setting = await AttendanceSetting.findOne({ isActive: true });
    if (!setting) {
      setting = await AttendanceSetting.create({});
    }
    return res.status(200).json({
      success: true,
      message: "Attendance settings fetched successfully.",
      data: setting,
    });
  } catch (error) {
    console.error("Get Attendance Settings Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

//! UPDATE BRANCH OFFICE LOCATION API (Admin Only)
export const updateBranchLocation = async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Admins can update branch office coordinates.",
      });
    }

    const { branchName, latitude, longitude, radius, address } = req.body;
    if (!branchName || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "branchName, latitude, and longitude are required.",
      });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);
    const rad = radius !== undefined ? Number(radius) : 200;

    if (
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid GPS coordinates.",
      });
    }

    let setting = await AttendanceSetting.findOne({ isActive: true });
    if (!setting) {
      setting = await AttendanceSetting.create({});
    }

    if (!Array.isArray(setting.branchLocations) || setting.branchLocations.length === 0) {
      setting.branchLocations = [
        {
          branchName: "Main Office",
          latitude: 19.314962,
          longitude: 84.794091,
          radius: 200,
          address: "Main Office, Berhampur, Ganjam, Odisha",
        },
        {
          branchName: "Santoshpur Branch",
          latitude: 20.25880,
          longitude: 85.78840,
          radius: 200,
          address: "Santoshpur Branch, Odisha",
        },
      ];
    }

    const existingIndex = setting.branchLocations.findIndex(
      (b) => b.branchName.toLowerCase() === branchName.trim().toLowerCase()
    );

    const updatedEntry = {
      branchName: branchName.trim(),
      latitude: lat,
      longitude: lng,
      radius: rad,
      address: address ? address.trim() : "",
    };

    if (existingIndex >= 0) {
      setting.branchLocations[existingIndex] = updatedEntry;
    } else {
      setting.branchLocations.push(updatedEntry);
    }

    await setting.save();

    return res.status(200).json({
      success: true,
      message: `Office location for '${branchName}' updated successfully.`,
      data: updatedEntry,
    });
  } catch (error) {
    console.error("Update Branch Location Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

//! GET INCOMPLETE ATTENDANCE FOR LOGGED-IN EMPLOYEE
export const getIncompleteAttendance = async (req, res) => {
  try {
    const employee = await User.findById(req.user._id).select("-password");
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const incompleteRecords = await Attendance.find({
      employee: employee._id,
      attendanceDate: { $lt: startOfToday },
      "checkIn.time": { $exists: true, $ne: null },
      $or: [{ "checkOut.time": null }, { "checkOut.time": { $exists: false } }],
    })
      .sort({ attendanceDate: -1 })
      .lean();

    // Fetch any associated correction requests
    const attendanceIds = incompleteRecords.map((r) => r._id);
    const corrections = await AttendanceCorrection.find({
      attendance: { $in: attendanceIds },
    })
      .sort({ createdAt: -1 })
      .lean();

    const correctionMap = {};
    corrections.forEach((c) => {
      // keep latest correction per attendance
      if (!correctionMap[c.attendance.toString()]) {
        correctionMap[c.attendance.toString()] = c;
      }
    });

    const formattedRecords = incompleteRecords.map((r) => {
      const d = new Date(r.attendanceDate);
      const dateFormatted = d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const correction = correctionMap[r._id.toString()] || null;
      const hasPending = correction?.status === "Pending" || Boolean(r.hasPendingCorrection);

      return {
        ...r,
        dateFormatted,
        warningMessage: hasPending
          ? null
          : `You didn’t check out on ${dateFormatted}. Please submit a correction request.`,
        correctionRequest: correction,
        hasPendingCorrection: hasPending,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Incomplete attendance records fetched successfully.",
      count: formattedRecords.length,
      data: formattedRecords,
    });
  } catch (error) {
    console.error("Get Incomplete Attendance Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

//! SUBMIT CORRECTION REQUEST (Employee Cannot Directly Edit Previous Times)
export const submitCorrectionRequest = async (req, res) => {
  try {
    const { attendanceId, requestedCheckOutTime, requestedCheckInTime, reason } = req.body;

    if (!attendanceId) {
      return res.status(400).json({
        success: false,
        message: "Attendance ID is required.",
      });
    }

    if (!reason || !reason.trim() || reason.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Reason is required and must be at least 3 characters.",
      });
    }

    if (!requestedCheckOutTime) {
      return res.status(400).json({
        success: false,
        message: "Requested check-out time is required.",
      });
    }

    const checkOutDate = new Date(requestedCheckOutTime);
    if (Number.isNaN(checkOutDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid requested check-out time format.",
      });
    }

    // Future check: checkOut cannot be in the future
    if (checkOutDate.getTime() > Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Requested check-out time cannot be in the future.",
      });
    }

    // Find attendance record
    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found.",
      });
    }

    // Verify ownership
    if (attendance.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only submit correction requests for your own attendance.",
      });
    }

    // Verify requested checkOut is after checkIn
    if (attendance.checkIn?.time && checkOutDate <= new Date(attendance.checkIn.time)) {
      return res.status(400).json({
        success: false,
        message: "Requested check-out time must be after the check-in time.",
      });
    }

    // Check if there is already a Pending request for this attendance
    const existingPending = await AttendanceCorrection.findOne({
      attendance: attendance._id,
      status: "Pending",
    });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: "A correction request for this attendance record is already pending review.",
        data: existingPending,
      });
    }

    // Create Correction Request with initial audit trail entry
    const correction = await AttendanceCorrection.create({
      employee: req.user._id,
      attendance: attendance._id,
      attendanceDate: attendance.attendanceDate,
      requestedCheckOutTime: checkOutDate,
      requestedCheckInTime: requestedCheckInTime ? new Date(requestedCheckInTime) : null,
      reason: reason.trim(),
      status: "Pending",
      auditTrail: [
        {
          action: "REQUEST_SUBMITTED",
          performedBy: req.user._id,
          performedByRole: req.user.role || "Employee",
          timestamp: new Date(),
          details: {
            reason: reason.trim(),
            requestedCheckOutTime: checkOutDate,
            originalCheckInTime: attendance.checkIn?.time || null,
          },
        },
      ],
    });

    // Mark attendance as having a pending correction
    attendance.hasPendingCorrection = true;
    await attendance.save();

    return res.status(201).json({
      success: true,
      message: "Correction request submitted successfully. Awaiting manager approval.",
      data: correction,
    });
  } catch (error) {
    console.error("Submit Correction Request Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

//! GET LOGGED-IN EMPLOYEE'S CORRECTION REQUESTS
export const getMyCorrectionRequests = async (req, res) => {
  try {
    const requests = await AttendanceCorrection.find({
      employee: req.user._id,
    })
      .populate("correctedBy", "name email role designation")
      .populate("attendance")
      .populate("auditTrail.performedBy", "name email role")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Correction requests fetched successfully.",
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("Get My Correction Requests Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

//! GET ALL CORRECTION REQUESTS (Admin & Branch Admin Flow)
export const getAllCorrectionRequests = async (req, res) => {
  try {
    const userRole = req.user.role;
    const isBranchAdmin =
      userRole === "Branch Admin" ||
      userRole === "Branch Manager" ||
      (userRole !== "Admin" && /^\s*branch\s*(admin|man?ager)\s*$/i.test(req.user.designation || ""));

    if (userRole !== "Admin" && !isBranchAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Admins and Branch Admins can access correction requests.",
      });
    }

    const { status, branch, search } = req.query;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 15, 1), 100);
    const skip = (page - 1) * limit;

    // Filter employees based on role & branch
    let employeeFilter = {};

    if (isBranchAdmin) {
      // Scoped strictly to the branch admin's branch
      const branchName = req.user.branch || "Santoshpur Branch";
      employeeFilter.branch = branchName;
    } else if (branch && branch !== "All") {
      employeeFilter.branch = branch;
    }

    if (search && search.trim()) {
      employeeFilter.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
        { employeeId: { $regex: search.trim(), $options: "i" } },
      ];
    }

    let matchingEmployeeIds = null;
    if (Object.keys(employeeFilter).length > 0) {
      const employees = await User.find(employeeFilter).select("_id");
      matchingEmployeeIds = employees.map((e) => e._id);
    }

    const filter = {};
    if (matchingEmployeeIds !== null) {
      filter.employee = { $in: matchingEmployeeIds };
    }

    if (status && status !== "All") {
      filter.status = status;
    }

    const [totalRecords, requests] = await Promise.all([
      AttendanceCorrection.countDocuments(filter),
      AttendanceCorrection.find(filter)
        .populate("employee", "name email employeeId department designation branch role")
        .populate("correctedBy", "name email role designation")
        .populate("attendance")
        .populate("auditTrail.performedBy", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);

    return res.status(200).json({
      success: true,
      message: "Correction requests fetched successfully.",
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords,
        limit,
      },
      data: requests,
    });
  } catch (error) {
    console.error("Get All Correction Requests Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

//! APPROVE CORRECTION REQUEST (Admin & Branch Admin)
export const approveCorrectionRequest = async (req, res) => {
  try {
    const userRole = req.user.role;
    const isBranchAdmin =
      userRole === "Branch Admin" ||
      userRole === "Branch Manager" ||
      (userRole !== "Admin" && /^\s*branch\s*(admin|man?ager)\s*$/i.test(req.user.designation || ""));

    if (userRole !== "Admin" && !isBranchAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Admins and Branch Admins can approve correction requests.",
      });
    }

    const { id } = req.params;
    const { actionReason } = req.body;

    const correction = await AttendanceCorrection.findById(id).populate("employee");
    if (!correction) {
      return res.status(404).json({
        success: false,
        message: "Correction request not found.",
      });
    }

    if (correction.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `This correction request has already been ${correction.status.toLowerCase()}.`,
      });
    }

    // 1. Self-approval guard: Requesters cannot approve their own correction requests
    if (correction.employee?._id?.toString() === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Self-approval is forbidden. You cannot approve your own attendance correction request.",
      });
    }

    // 2. Branch Admin special business rule:
    // If a Branch Admin submits a correction request, it must be approved exclusively by Admin.
    // A Branch Admin cannot approve their own or another Branch Admin's request.
    const isRequesterBranchAdmin =
      correction.employee?.role === "Branch Admin" ||
      correction.employee?.role === "Branch Manager" ||
      (/^\s*branch\s*(admin|man?ager)\s*$/i.test(correction.employee?.designation || ""));

    if (isBranchAdmin && isRequesterBranchAdmin) {
      return res.status(403).json({
        success: false,
        message: "Branch Admin correction requests require Administrator approval. Branch Admins cannot approve Branch Admin requests.",
      });
    }

    // 3. Branch Admin scoping check
    if (isBranchAdmin) {
      const managerBranch = req.user.branch || "Santoshpur Branch";
      const empBranch = correction.employee?.branch;
      if (empBranch !== managerBranch) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You can only approve correction requests for ${managerBranch}.`,
        });
      }
    }

    // Find and update Attendance
    const attendance = await Attendance.findById(correction.attendance);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Associated attendance record not found.",
      });
    }

    const checkInTime = attendance.checkIn?.time;
    const checkOutTime = new Date(correction.requestedCheckOutTime);

    const workingHours = calculateWorkingHours(checkInTime, checkOutTime);
    const overtimeHours = calculateOvertime(workingHours);

    // Apply correction to Attendance record
    attendance.checkOut = {
      time: checkOutTime,
      location: attendance.checkOut?.location?.latitude
        ? attendance.checkOut.location
        : attendance.checkIn?.location || { address: "Branch Verified" },
      photo: attendance.checkOut?.photo || "",
      device: `Manual Correction approved by ${req.user.name}`,
      ipAddress: "",
    };

    attendance.workingHours = workingHours;
    attendance.overtimeHours = overtimeHours;
    attendance.isManual = true;
    attendance.manualReason = correction.reason;
    attendance.approvedBy = req.user._id;
    attendance.correctedBy = req.user._id;
    attendance.correctedAt = new Date();
    attendance.hasPendingCorrection = false;
    attendance.remarks = `Approved by ${req.user.name} (${req.user.role}). Reason: ${correction.reason}`;
    attendance.attendanceStatus = attendance.isLate ? "Late" : "Present";

    await attendance.save();

    // Update AttendanceCorrection request
    correction.status = "Approved";
    correction.correctedBy = req.user._id;
    correction.correctedAt = new Date();
    correction.actionReason = actionReason ? actionReason.trim() : "Approved by Manager";
    correction.auditTrail.push({
      action: "APPROVED",
      performedBy: req.user._id,
      performedByRole: req.user.role || "Admin",
      timestamp: new Date(),
      details: {
        actionReason: correction.actionReason,
        checkOutTime,
        workingHours,
        overtimeHours,
      },
    });

    await correction.save();

    return res.status(200).json({
      success: true,
      message: "Correction request approved and attendance record updated successfully.",
      data: {
        correction,
        attendance,
      },
    });
  } catch (error) {
    console.error("Approve Correction Request Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

//! REJECT CORRECTION REQUEST (Admin & Branch Admin)
export const rejectCorrectionRequest = async (req, res) => {
  try {
    const userRole = req.user.role;
    const isBranchAdmin =
      userRole === "Branch Admin" ||
      userRole === "Branch Manager" ||
      (userRole !== "Admin" && /^\s*branch\s*(admin|man?ager)\s*$/i.test(req.user.designation || ""));

    if (userRole !== "Admin" && !isBranchAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Admins and Branch Admins can reject correction requests.",
      });
    }

    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim() || reason.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required and must be at least 3 characters.",
      });
    }

    const correction = await AttendanceCorrection.findById(id).populate("employee");
    if (!correction) {
      return res.status(404).json({
        success: false,
        message: "Correction request not found.",
      });
    }

    if (correction.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `This correction request has already been ${correction.status.toLowerCase()}.`,
      });
    }

    // 1. Self-action guard: Requesters cannot reject their own correction requests
    if (correction.employee?._id?.toString() === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Self-action is forbidden. You cannot reject your own attendance correction request.",
      });
    }

    // 2. Branch Admin special business rule:
    // If a Branch Admin submits a correction request, it must be acted upon exclusively by Admin.
    const isRequesterBranchAdmin =
      correction.employee?.role === "Branch Admin" ||
      correction.employee?.role === "Branch Manager" ||
      (/^\s*branch\s*(admin|man?ager)\s*$/i.test(correction.employee?.designation || ""));

    if (isBranchAdmin && isRequesterBranchAdmin) {
      return res.status(403).json({
        success: false,
        message: "Branch Admin correction requests require Administrator review. Branch Admins cannot reject Branch Admin requests.",
      });
    }

    // 3. Branch Admin scoping check
    if (isBranchAdmin) {
      const managerBranch = req.user.branch || "Santoshpur Branch";
      const empBranch = correction.employee?.branch;
      if (empBranch !== managerBranch) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You can only reject correction requests for ${managerBranch}.`,
        });
      }
    }

    // Update AttendanceCorrection request
    correction.status = "Rejected";
    correction.correctedBy = req.user._id;
    correction.correctedAt = new Date();
    correction.actionReason = reason.trim();
    correction.auditTrail.push({
      action: "REJECTED",
      performedBy: req.user._id,
      performedByRole: req.user.role || "Admin",
      timestamp: new Date(),
      details: {
        rejectionReason: reason.trim(),
      },
    });

    await correction.save();

    // Release pending flag on Attendance
    await Attendance.findByIdAndUpdate(correction.attendance, {
      hasPendingCorrection: false,
    });

    return res.status(200).json({
      success: true,
      message: "Correction request rejected successfully.",
      data: correction,
    });
  } catch (error) {
    console.error("Reject Correction Request Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};