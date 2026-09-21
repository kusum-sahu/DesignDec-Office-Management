import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import Order from "../models/Order.js";

const ALLOWED_BRANCHES = ["Main Office", "Santoshpur Branch"];

/**
 * @desc Get Unified Business & Attendance Dashboard Statistics
 * @route GET /api/v1/dashboard
 * @access Private (Admin / Branch Staff)
 */
export const getDashboardStatistics = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.status !== "Active") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact the administrator."
      });
    }

    const { role, branch: userBranch } = user;
    const branchFilter = {};
    let activeBranch = null;

    // Role-based security:
    // Admin can view all branches combined or filter by ?branch=...
    // Non-admin (staff/branch manager) is strictly locked to their assigned branch.
    if (role === "Admin") {
      const requestedBranch = req.query.branch?.trim();
      if (requestedBranch) {
        if (!ALLOWED_BRANCHES.includes(requestedBranch)) {
          return res.status(400).json({
            success: false,
            message: `Invalid branch '${requestedBranch}'. Allowed branches: ${ALLOWED_BRANCHES.join(", ")}`
          });
        }
        branchFilter.branch = requestedBranch;
        activeBranch = requestedBranch;
      }
    } else {
      // Non-admin MUST have a valid assigned branch and CANNOT access Main Office.
      if (!userBranch || !ALLOWED_BRANCHES.includes(userBranch) || userBranch === "Main Office") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Branch office staff cannot access Main Office data. Please contact an Administrator to assign your branch."
        });
      }
      activeBranch = userBranch;
      branchFilter.branch = activeBranch;
    }

    // Time boundaries (Local midnight boundaries)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const endOfTomorrow = new Date(endOfToday);
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);

    // Queries filters
    const employeeQuery = { role: { $in: ["Employee", "Branch Admin", "Branch Manager"] }, status: "Active" };
    if (branchFilter.branch) {
      employeeQuery.branch = branchFilter.branch;
    }

    const nonCancelledMatch = {
      ...branchFilter,
      deliveryStatus: { $ne: "Cancelled" }
    };

    const activeDeadlineMatch = {
      ...branchFilter,
      deliveryStatus: { $in: ["Pending", "In Progress", "Ready"] }
    };

    // Parallel execution for maximum throughput
    const [
      activeEmployees,
      todayAttendanceRecords,
      financialStats,
      orderStatusAgg,
      todayOrdersCount,
      totalOrdersCount,
      overdueCount,
      dueTodayCount,
      dueTomorrowCount,
      upcomingCount,
      urgentOrders,
      branchAgg,
      recentOrders
    ] = await Promise.all([
      // 1. Active Employees in scope
      User.find(employeeQuery).select("_id name branch").lean(),

      // 2. Today's Attendance records
      Attendance.find({
        attendanceDate: { $gte: startOfToday, $lte: endOfToday }
      }).select("employee attendanceStatus checkIn checkOut isLate").lean(),

      // 3. Financial Totals (Order Value, Advance, Pending)
      Order.aggregate([
        { $match: nonCancelledMatch },
        {
          $group: {
            _id: null,
            totalOrderValue: { $sum: "$totalPrice" },
            totalAdvanceCollected: { $sum: "$advancePaid" },
            totalPendingPayment: { $sum: "$pendingBalance" },
            activeOrderCount: { $sum: 1 }
          }
        }
      ]),

      // 4. Order Pipeline Status Breakdown
      Order.aggregate([
        { $match: branchFilter },
        {
          $group: {
            _id: "$deliveryStatus",
            count: { $sum: 1 }
          }
        }
      ]),

      // 5. Today's Orders Count
      Order.countDocuments({
        ...branchFilter,
        createdAt: { $gte: startOfToday, $lte: endOfToday }
      }),

      // 6. Total Orders Count
      Order.countDocuments(branchFilter),

      // 7. Deadlines: Overdue (< startOfToday)
      Order.countDocuments({
        ...activeDeadlineMatch,
        deliveryDeadline: { $lt: startOfToday }
      }),

      // 8. Deadlines: Due Today (startOfToday <= deadline <= endOfToday)
      Order.countDocuments({
        ...activeDeadlineMatch,
        deliveryDeadline: { $gte: startOfToday, $lte: endOfToday }
      }),

      // 9. Deadlines: Due Tomorrow (startOfTomorrow <= deadline <= endOfTomorrow)
      Order.countDocuments({
        ...activeDeadlineMatch,
        deliveryDeadline: { $gte: startOfTomorrow, $lte: endOfTomorrow }
      }),

      // 10. Deadlines: Upcoming (> endOfTomorrow)
      Order.countDocuments({
        ...activeDeadlineMatch,
        deliveryDeadline: { $gt: endOfTomorrow }
      }),

      // 11. Urgent Orders List (Overdue + Due Today + Due Tomorrow)
      Order.find({
        ...activeDeadlineMatch,
        deliveryDeadline: { $lte: endOfTomorrow }
      })
        .select("orderNumber customerName contactNo itemType deliveryDeadline deliveryStatus branch pendingBalance totalPrice")
        .sort({ deliveryDeadline: 1 })
        .limit(10)
        .lean(),

      // 12. Branch Revenue & Share Split Aggregation (in scope non-cancelled orders)
      Order.aggregate([
        { $match: nonCancelledMatch },
        {
          $group: {
            _id: "$branch",
            orderCount: { $sum: 1 },
            orderValue: { $sum: "$totalPrice" },
            mainOfficeShare: { $sum: "$revenueSplit.mainOfficeShare" },
            branchShare: { $sum: "$revenueSplit.branchShare" },
            advanceCollected: { $sum: "$advancePaid" },
            pendingPayment: { $sum: "$pendingBalance" }
          }
        }
      ]),

      // 13. Recent Orders
      Order.find(branchFilter)
        .select("orderNumber customerName itemType totalPrice paymentStatus deliveryStatus deliveryDeadline branch createdAt")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
    ]);

    // 1. Process Attendance Metrics
    const totalActiveEmployees = activeEmployees.length;
    const activeEmployeeIdSet = new Set(activeEmployees.map((e) => e._id.toString()));

    const inScopeAttendance = todayAttendanceRecords.filter(
      (att) => att.employee && activeEmployeeIdSet.has(att.employee.toString())
    );

    const presentSet = new Set();
    const lateSet = new Set();
    const checkedInSet = new Set();
    const checkedOutSet = new Set();

    inScopeAttendance.forEach((att) => {
      const empId = att.employee.toString();
      if (att.attendanceStatus !== "Absent" || (att.checkIn && att.checkIn.time)) {
        presentSet.add(empId);
      }
      if (att.attendanceStatus === "Late" || att.isLate === true) {
        lateSet.add(empId);
      }
      if (att.checkIn && att.checkIn.time) {
        checkedInSet.add(empId);
      }
      if (att.checkOut && att.checkOut.time) {
        checkedOutSet.add(empId);
      }
    });

    const presentToday = presentSet.size;
    const absentToday = Math.max(0, totalActiveEmployees - presentToday);
    const lateToday = lateSet.size;
    const checkedIn = checkedInSet.size;
    const checkedOut = checkedOutSet.size;

    // 2. Process Order Pipeline
    const statusCounts = {
      Pending: 0,
      "In Progress": 0,
      Ready: 0,
      Delivered: 0,
      Cancelled: 0
    };
    orderStatusAgg.forEach((item) => {
      if (item._id && Object.prototype.hasOwnProperty.call(statusCounts, item._id)) {
        statusCounts[item._id] = item.count;
      }
    });

    const ordersData = {
      totalOrders: totalOrdersCount,
      todayOrders: todayOrdersCount,
      pending: statusCounts["Pending"],
      inProgress: statusCounts["In Progress"],
      ready: statusCounts["Ready"],
      delivered: statusCounts["Delivered"],
      cancelled: statusCounts["Cancelled"]
    };

    // 3. Process Financials (Strictly non-cancelled, non-negative)
    const financesRaw = financialStats[0] || {};
    const totalOrderValue = Number(Math.max(0, financesRaw.totalOrderValue || 0).toFixed(2));
    const totalAdvanceCollected = Number(Math.max(0, financesRaw.totalAdvanceCollected || 0).toFixed(2));
    const totalPendingPayment = Number(Math.max(0, financesRaw.totalPendingPayment || 0).toFixed(2));

    const financialsData = {
      totalOrderValue,
      totalAdvanceCollected,
      totalPendingPayment,
      // Backward compatibility aliases:
      totalRevenue: totalOrderValue,
      totalAdvance: totalAdvanceCollected,
      totalPending: totalPendingPayment
    };

    // 4. Process Deadlines
    const formattedUrgentOrders = urgentOrders.map((order) => ({
      ...order,
      isOverdue: new Date(order.deliveryDeadline) < now
    }));

    const deadlinesData = {
      overdue: overdueCount,
      dueToday: dueTodayCount,
      dueTomorrow: dueTomorrowCount,
      upcoming: upcomingCount,
      urgentOrders: formattedUrgentOrders
    };

    // 5. Process Branch Summaries
    const branchMap = {
      "Main Office": {
        branch: "Main Office",
        orderCount: 0,
        orderValue: 0,
        mainOfficeShare: 0,
        branchShare: 0,
        advanceCollected: 0,
        pendingPayment: 0
      },
      "Santoshpur Branch": {
        branch: "Santoshpur Branch",
        orderCount: 0,
        orderValue: 0,
        mainOfficeShare: 0,
        branchShare: 0,
        advanceCollected: 0,
        pendingPayment: 0
      }
    };

    branchAgg.forEach((item) => {
      if (item._id && branchMap[item._id]) {
        branchMap[item._id] = {
          branch: item._id,
          orderCount: item.orderCount || 0,
          orderValue: Number(Math.max(0, item.orderValue || 0).toFixed(2)),
          mainOfficeShare: Number(Math.max(0, item.mainOfficeShare || 0).toFixed(2)),
          branchShare: Number(Math.max(0, item.branchShare || 0).toFixed(2)),
          advanceCollected: Number(Math.max(0, item.advanceCollected || 0).toFixed(2)),
          pendingPayment: Number(Math.max(0, item.pendingPayment || 0).toFixed(2))
        };
      }
    });

    let branchesData = [];
    if (role === "Admin") {
      if (branchFilter.branch) {
        branchesData = [branchMap[branchFilter.branch]];
      } else {
        branchesData = ALLOWED_BRANCHES.map((name) => branchMap[name]);
      }
    } else {
      // Non-admin can ONLY view their assigned branch summary
      branchesData = [branchMap[activeBranch]];
    }

    // Success response
    return res.status(200).json({
      success: true,
      message: "Dashboard statistics fetched successfully.",
      data: {
        attendance: {
          totalActiveEmployees,
          presentToday,
          absentToday,
          late: lateToday,
          checkedIn,
          checkedOut
        },
        orders: ordersData,
        financials: financialsData,
        deadlines: deadlinesData,
        branches: branchesData,
        recentOrders,
        // Backward-compatibility aliases
        orderPipeline: statusCounts,
        urgentDeadlines: {
          count: formattedUrgentOrders.length,
          orders: formattedUrgentOrders
        },
        branchShares: branchesData
      }
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error while generating dashboard metrics."
    });
  }
};

/**
 * @desc Get Today's Detailed Attendance Records
 * @route GET /api/v1/dashboard/today-attendance
 * @access Private (Admin / Branch Staff)
 */
export const getTodayAttendance = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.status !== "Active") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact the administrator."
      });
    }

    const { role, branch: userBranch } = user;
    const employeeFilter = { role: { $in: ["Employee", "Branch Admin", "Branch Manager"] }, status: "Active" };

    if (role === "Admin") {
      const requestedBranch = req.query.branch?.trim();
      if (requestedBranch) {
        if (!ALLOWED_BRANCHES.includes(requestedBranch)) {
          return res.status(400).json({
            success: false,
            message: `Invalid branch '${requestedBranch}'. Allowed branches: ${ALLOWED_BRANCHES.join(", ")}`
          });
        }
        employeeFilter.branch = requestedBranch;
      }
    } else {
      // Non-admin MUST have a valid assigned branch. Never assume or default.
      if (!userBranch || !ALLOWED_BRANCHES.includes(userBranch)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. No valid branch assigned to your account. Please contact an Administrator to assign your branch."
        });
      }
      employeeFilter.branch = userBranch;
    }

    const inScopeEmployeeIds = await User.find(employeeFilter).distinct("_id");

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const attendance = await Attendance.find({
      employee: { $in: inScopeEmployeeIds },
      attendanceDate: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    })
      .populate({
        path: "employee",
        select: "employeeId name department designation branch"
      })
      .select("attendanceDate checkIn checkOut attendanceStatus workingHours overtimeHours shift isLate employee")
      .sort({ "checkIn.time": 1, createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Today's attendance fetched successfully.",
      totalRecords: attendance.length,
      data: attendance
    });
  } catch (error) {
    console.error("Today Attendance Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error."
    });
  }
};
