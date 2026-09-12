import dotenv from "dotenv";
dotenv.config();

import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Attendance from "../models/Attendance.js";

const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;

const generateTestToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

async function runTests() {
  console.log("=================================================");
  console.log("🧪 RUNNING COMPREHENSIVE BACKEND DASHBOARD TESTS");
  console.log("=================================================");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB for test fixtures.");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ""}`);
      failed++;
    }
  }

  try {
    // Fixture Users
    const adminUser = await User.findOne({ role: "Admin" });
    if (!adminUser) throw new Error("No Admin user found in database!");

    let branchUser = await User.findOne({ role: "Employee", status: "Active" });
    if (!branchUser) throw new Error("No active employee found in database!");

    // Assign branchUser to 'Santoshpur Branch' for test predictability
    branchUser.branch = "Santoshpur Branch";
    await branchUser.save();

    // Inactive User Fixture
    let inactiveUser = await User.findOne({ status: "Inactive" });
    if (!inactiveUser) {
      inactiveUser = await User.create({
        employeeId: "TEST-INACTIVE-01",
        name: "Inactive Test User",
        email: "inactive.test@designdec.in",
        password: "Password@123",
        role: "Employee",
        status: "Inactive",
        branch: "Main Office"
      });
    }

    const adminToken = generateTestToken(adminUser._id);
    const branchToken = generateTestToken(branchUser._id);
    const inactiveToken = generateTestToken(inactiveUser._id);

    // ==============================================================
    // TEST 1: Unauthorized Access
    // ==============================================================
    console.log("\n--- TEST GROUP 1: Authentication & Authorization ---");

    const resNoAuth = await fetch(`${BASE_URL}/api/v1/dashboard`);
    assert(resNoAuth.status === 401, "Reject request without token (401)");

    const resInvalidToken = await fetch(`${BASE_URL}/api/v1/dashboard`, {
      headers: { Authorization: "Bearer invalid.token.value" }
    });
    assert(resInvalidToken.status === 401, "Reject request with invalid token (401)");

    const resInactive = await fetch(`${BASE_URL}/api/v1/dashboard`, {
      headers: { Authorization: `Bearer ${inactiveToken}` }
    });
    assert(resInactive.status === 403, "Reject inactive user account (403)");

    // ==============================================================
    // TEST 2: Admin Dashboard Statistics (All Branches Combined)
    // ==============================================================
    console.log("\n--- TEST GROUP 2: Admin Dashboard Statistics (Combined) ---");

    const resAdmin = await fetch(`${BASE_URL}/api/v1/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const dataAdmin = await resAdmin.json();

    assert(resAdmin.status === 200, "Admin dashboard returns HTTP 200");
    assert(dataAdmin.success === true, "Admin dashboard success is true");
    assert(dataAdmin.data !== undefined, "Response contains 'data' object");

    // Check Attendance structure
    const att = dataAdmin.data.attendance;
    assert(typeof att.totalActiveEmployees === "number" && att.totalActiveEmployees >= 0, "Attendance has totalActiveEmployees >= 0");
    assert(typeof att.presentToday === "number" && att.presentToday >= 0, "Attendance has presentToday >= 0");
    assert(typeof att.absentToday === "number" && att.absentToday >= 0, "Attendance has absentToday >= 0");
    assert(att.absentToday === Math.max(0, att.totalActiveEmployees - att.presentToday), "absentToday = active - present");
    assert(typeof att.late === "number" && att.late >= 0, "Attendance has late >= 0");
    assert(typeof att.checkedIn === "number" && att.checkedIn >= 0, "Attendance has checkedIn >= 0");
    assert(typeof att.checkedOut === "number" && att.checkedOut >= 0, "Attendance has checkedOut >= 0");

    // Check Orders structure
    const ord = dataAdmin.data.orders;
    assert(typeof ord.totalOrders === "number" && ord.totalOrders >= 0, "Orders has totalOrders >= 0");
    assert(typeof ord.todayOrders === "number" && ord.todayOrders >= 0, "Orders has todayOrders >= 0");
    assert(typeof ord.pending === "number" && ord.pending >= 0, "Orders has pending >= 0");
    assert(typeof ord.inProgress === "number" && ord.inProgress >= 0, "Orders has inProgress >= 0");
    assert(typeof ord.ready === "number" && ord.ready >= 0, "Orders has ready >= 0");
    assert(typeof ord.delivered === "number" && ord.delivered >= 0, "Orders has delivered >= 0");
    assert(typeof ord.cancelled === "number" && ord.cancelled >= 0, "Orders has cancelled >= 0");
    assert(
      ord.pending + ord.inProgress + ord.ready + ord.delivered + ord.cancelled === ord.totalOrders,
      "Order status counts sum to totalOrders"
    );

    // Check Financials structure
    const fin = dataAdmin.data.financials;
    assert(typeof fin.totalOrderValue === "number" && !isNaN(fin.totalOrderValue), "Financials has valid totalOrderValue");
    assert(typeof fin.totalAdvanceCollected === "number" && !isNaN(fin.totalAdvanceCollected), "Financials has valid totalAdvanceCollected");
    assert(typeof fin.totalPendingPayment === "number" && !isNaN(fin.totalPendingPayment), "Financials has valid totalPendingPayment");
    assert(fin.totalRevenue === fin.totalOrderValue, "Backward-compatible alias totalRevenue matches totalOrderValue");
    assert(fin.totalAdvance === fin.totalAdvanceCollected, "Backward-compatible alias totalAdvance matches totalAdvanceCollected");
    assert(fin.totalPending === fin.totalPendingPayment, "Backward-compatible alias totalPending matches totalPendingPayment");

    // Check Deadlines structure
    const dl = dataAdmin.data.deadlines;
    assert(typeof dl.overdue === "number" && dl.overdue >= 0, "Deadlines has overdue >= 0");
    assert(typeof dl.dueToday === "number" && dl.dueToday >= 0, "Deadlines has dueToday >= 0");
    assert(typeof dl.dueTomorrow === "number" && dl.dueTomorrow >= 0, "Deadlines has dueTomorrow >= 0");
    assert(typeof dl.upcoming === "number" && dl.upcoming >= 0, "Deadlines has upcoming >= 0");
    assert(Array.isArray(dl.urgentOrders), "Deadlines urgentOrders is an array");
    if (dl.urgentOrders.length > 0) {
      assert(typeof dl.urgentOrders[0].isOverdue === "boolean", "urgentOrders items contain 'isOverdue' boolean flag");
    }

    // Check Branches structure for Admin
    const brs = dataAdmin.data.branches;
    assert(Array.isArray(brs) && brs.length === 2, "Admin sees both branches in branches array");
    const branchNames = brs.map((b) => b.branch);
    assert(branchNames.includes("Main Office") && branchNames.includes("Santoshpur Branch"), "Branches array contains 'Main Office' and 'Santoshpur Branch'");
    assert(typeof brs[0].orderCount === "number", "Branch summary includes orderCount");
    assert(typeof brs[0].mainOfficeShare === "number", "Branch summary includes mainOfficeShare");
    assert(typeof brs[0].branchShare === "number", "Branch summary includes branchShare");
    assert(typeof brs[0].pendingPayment === "number", "Branch summary includes pendingPayment");

    // Check Recent Orders
    const ro = dataAdmin.data.recentOrders;
    assert(Array.isArray(ro), "Recent orders is an array");
    if (ro.length > 0) {
      const first = ro[0];
      assert(
        first.orderNumber && first.customerName && first.itemType && first.totalPrice !== undefined &&
        first.paymentStatus && first.deliveryStatus && first.deliveryDeadline && first.branch && first.createdAt,
        "Recent order contains all required fields (orderNumber, customerName, itemType, totalPrice, etc.)"
      );
    }

    // ==============================================================
    // TEST 3: Admin Branch Filtering (?branch=...)
    // ==============================================================
    console.log("\n--- TEST GROUP 3: Admin Branch Filtering ---");

    const resFilterSantoshpur = await fetch(`${BASE_URL}/api/v1/dashboard?branch=Santoshpur Branch`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const dataFilterSantoshpur = await resFilterSantoshpur.json();
    assert(resFilterSantoshpur.status === 200, "Admin can filter by Santoshpur Branch (200)");
    assert(dataFilterSantoshpur.data.branches.length === 1, "Filtered branches array has 1 branch");
    assert(dataFilterSantoshpur.data.branches[0].branch === "Santoshpur Branch", "Filtered branch is 'Santoshpur Branch'");
    if (dataFilterSantoshpur.data.recentOrders.length > 0) {
      assert(
        dataFilterSantoshpur.data.recentOrders.every((o) => o.branch === "Santoshpur Branch"),
        "All recent orders belong exclusively to Santoshpur Branch"
      );
    }

    const resFilterMain = await fetch(`${BASE_URL}/api/v1/dashboard?branch=Main Office`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const dataFilterMain = await resFilterMain.json();
    assert(resFilterMain.status === 200, "Admin can filter by Main Office (200)");
    assert(dataFilterMain.data.branches[0].branch === "Main Office", "Filtered branch is 'Main Office'");

    // Invalid Branch Query Parameter
    const resInvalidBranch = await fetch(`${BASE_URL}/api/v1/dashboard?branch=InvalidBranchName`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(resInvalidBranch.status === 400, "Admin query with invalid branch returns 400 Bad Request");

    // ==============================================================
    // TEST 4: Branch Staff Access & Security Enforcement
    // ==============================================================
    console.log("\n--- TEST GROUP 4: Branch Staff Role & Security Isolation ---");

    const resStaff = await fetch(`${BASE_URL}/api/v1/dashboard`, {
      headers: { Authorization: `Bearer ${branchToken}` }
    });
    const dataStaff = await resStaff.json();
    assert(resStaff.status === 200, "Branch staff can access dashboard (200)");
    assert(dataStaff.data.branches.length === 1, "Branch staff sees only 1 branch summary");
    assert(dataStaff.data.branches[0].branch === "Santoshpur Branch", "Branch staff summary matches their assigned branch");
    if (dataStaff.data.recentOrders.length > 0) {
      assert(
        dataStaff.data.recentOrders.every((o) => o.branch === "Santoshpur Branch"),
        "Branch staff recent orders are strictly filtered to their branch"
      );
    }

    // Tamper Attempt: Branch user passing ?branch=Main Office
    const resTamper = await fetch(`${BASE_URL}/api/v1/dashboard?branch=Main Office`, {
      headers: { Authorization: `Bearer ${branchToken}` }
    });
    const dataTamper = await resTamper.json();
    assert(resTamper.status === 200, "Branch tamper query succeeds with HTTP 200 (ignores malicious param)");
    assert(dataTamper.data.branches[0].branch === "Santoshpur Branch", "Server discarded ?branch=Main Office; returned Santoshpur Branch");

    // Strict Rule Check: Non-Admin with missing or invalid branch must be denied with 403
    let unassignedEmployee = await User.findOne({ employeeId: "TEST-NOBRANCH-01" });
    if (!unassignedEmployee) {
      unassignedEmployee = await User.create({
        employeeId: "TEST-NOBRANCH-01",
        name: "Unassigned Branch Employee",
        email: "nobranch.test@designdec.in",
        password: "Password@123",
        role: "Employee",
        status: "Active",
        branch: null
      });
    } else {
      unassignedEmployee.branch = null;
      await unassignedEmployee.save();
    }

    const unassignedToken = generateTestToken(unassignedEmployee._id);

    const resUnassignedDash = await fetch(`${BASE_URL}/api/v1/dashboard`, {
      headers: { Authorization: `Bearer ${unassignedToken}` }
    });
    const dataUnassignedDash = await resUnassignedDash.json();
    assert(resUnassignedDash.status === 403, "Non-admin without assigned branch is DENIED dashboard access (403)");
    assert(
      dataUnassignedDash.message && dataUnassignedDash.message.includes("No valid branch assigned"),
      "Denied message explains missing branch configuration clearly"
    );

    const resUnassignedAtt = await fetch(`${BASE_URL}/api/v1/dashboard/today-attendance`, {
      headers: { Authorization: `Bearer ${unassignedToken}` }
    });
    const dataUnassignedAtt = await resUnassignedAtt.json();
    assert(resUnassignedAtt.status === 403, "Non-admin without assigned branch is DENIED today-attendance access (403)");

    // Test after Admin assigns a valid branch
    unassignedEmployee.branch = "Main Office";
    await unassignedEmployee.save();

    const resAssignedDash = await fetch(`${BASE_URL}/api/v1/dashboard`, {
      headers: { Authorization: `Bearer ${unassignedToken}` }
    });
    const dataAssignedDash = await resAssignedDash.json();
    assert(resAssignedDash.status === 200, "Access GRANTED once Admin assigns valid branch 'Main Office' (200)");
    assert(dataAssignedDash.data.branches[0].branch === "Main Office", "Assigned employee now sees 'Main Office'");

    // Clean up temporary unassigned employee
    await User.deleteOne({ _id: unassignedEmployee._id });

    // ==============================================================
    // TEST 5: Today's Attendance API (/api/v1/dashboard/today-attendance)
    // ==============================================================
    console.log("\n--- TEST GROUP 5: Today's Attendance API ---");

    const resTodayAttNoAuth = await fetch(`${BASE_URL}/api/v1/dashboard/today-attendance`);
    assert(resTodayAttNoAuth.status === 401, "Reject unauthenticated today-attendance request (401)");

    const resTodayAttAdmin = await fetch(`${BASE_URL}/api/v1/dashboard/today-attendance`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const dataTodayAttAdmin = await resTodayAttAdmin.json();
    assert(resTodayAttAdmin.status === 200, "Admin today-attendance returns 200");
    assert(dataTodayAttAdmin.success === true, "today-attendance success is true");
    assert(Array.isArray(dataTodayAttAdmin.data), "today-attendance data is array");
    assert(typeof dataTodayAttAdmin.totalRecords === "number", "today-attendance includes totalRecords");

    const resTodayAttStaff = await fetch(`${BASE_URL}/api/v1/dashboard/today-attendance`, {
      headers: { Authorization: `Bearer ${branchToken}` }
    });
    const dataTodayAttStaff = await resTodayAttStaff.json();
    assert(resTodayAttStaff.status === 200, "Branch staff today-attendance returns 200");

    // ==============================================================
    // TEST 6: Existing Regression APIs (Orders & Notifications)
    // ==============================================================
    console.log("\n--- TEST GROUP 6: Regression Testing on Existing Modules ---");

    const resOrders = await fetch(`${BASE_URL}/api/v1/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const dataOrders = await resOrders.json();
    assert(resOrders.status === 200, "GET /api/v1/orders remains functional (200)");
    assert(Array.isArray(dataOrders.orders), "Existing order API returns orders array");

    const resNotifications = await fetch(`${BASE_URL}/api/v1/notifications`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const dataNotifications = await resNotifications.json();
    assert(resNotifications.status === 200, "GET /api/v1/notifications remains functional (200)");
    assert(Array.isArray(dataNotifications.notifications), "Existing notification API returns notifications array");

    console.log("\n=================================================");
    console.log(`🏁 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("=================================================");

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error("Test execution failed with error:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
