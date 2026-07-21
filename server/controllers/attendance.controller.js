import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import getAttendanceStatus from "../utils/getAttendanceStatus.js";
import calculateWorkingHours from "../utils/calculateWorkingHours.js";
import calculateOvertime from "../utils/calculateOvertime.js";
import formatDateTime from "../utils/formatDateTime.js";

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

    const { latitude, longitude, address } = req.body;
    // Latitude Validation
    if (latitude === undefined || latitude === null) {
      return res.status(400).json({
        success: false,
        message: "Latitude is required.",
      });
    }
    // Longitude Validation
    if (latitude === undefined || latitude === null) {
      return res.status(400).json({
        success: false,
        message: "Longitude is required.",
      });
    }
    const lat = Number(latitude);
    const lng = Number(longitude);

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

    const formattedAddress = address?.trim() || "";
    // Duplicate Check
    const attendanceDate = new Date();
    attendanceDate.setHours(0, 0, 0, 0);
    const alreadyCheckedIn = await Attendance.findOne({
      employee: employee._id,
      attendanceDate,
    });

    if (alreadyCheckedIn) {
      return res.status(409).json({
        success: false,
        message: "You have already checked in today.",
      });
    }

    const checkInTime = new Date();

    // ⭐ Add Here if multer this type of code is used ....Cloudinary ya AWS S3 migrate karne me bhi easy rahega. uploads/checkin/17528453655-photo.jpg
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
      attendanceDate,
      checkIn: {
        time: checkInTime,
        location: {
          latitude: lat,
          longitude: lng,
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

    const { latitude, longitude, address } = req.body;

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

    // ===========================================
    // Common Variables
    // ===========================================

    const formattedAddress = address?.trim() || "";

    const attendanceDate = new Date();
    attendanceDate.setHours(0, 0, 0, 0);

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
      attendanceDate,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "No check-in record found for today. Please check in first.",
      });
    }

    // ===========================================
    // Check-In Validation
    // ===========================================

    if (!attendance.checkIn.time) {
      return res.status(400).json({
        success: false,
        message: "Check-in is not completed.",
      });
    }

    // ===========================================
    // Prevent Double Check-Out
    // ===========================================

    if (attendance.checkOut.time) {
      return res.status(409).json({
        success: false,
        message: "You have already checked out today.",
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

//! Admin Attendance Reports API
export const getAdminAttendanceReport = async (req, res) => {
    try {
        // Check Admin
        const admin = await User.findById(req.user._id);
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found."
            });
        }
        if (admin.role !== "Admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied."
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
        // Base Filter employeeId (DD-2026-001 )baad me
        const filter = {};
        if (employee) {
    filter.employee = employee;
}
// Search Employee
if (search) {
    const employees = await User.find({
        $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { employeeId: { $regex: search, $options: "i" } }
        ]
    }).select("_id");
    filter.employee = {
        $in: employees.map((emp) => emp._id)
    };
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