import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import AttendanceCorrection from "../models/AttendanceCorrection.js";

const BASE_URL = `http://127.0.0.1:${process.env.PORT || 5000}/api/v1`;

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

async function runTests() {
  console.log("===================================================================");
  console.log("🧪 RUNNING BRANCH ADMIN RBAC & REGRESSION TEST SUITE");
  console.log("===================================================================");

  await connectDB();

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = "") {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} ${details ? `(${details})` : ""}`);
      failed++;
    }
  }

  try {
    // 1. Setup Fixtures
    let admin = await User.findOne({ role: "Admin" });
    if (!admin) {
      admin = await User.create({
        employeeId: "ADM-TEST-99",
        name: "Super Admin Test",
        email: "admin.test@designdec.internal",
        password: "Password@123",
        role: "Admin",
        status: "Active",
        branch: "Main Office",
      });
    }

    let santoshpurBranchAdmin = await User.findOne({
      email: "ba.santoshpur.test@designdec.internal",
    });
    if (!santoshpurBranchAdmin) {
      santoshpurBranchAdmin = await User.create({
        employeeId: "BA-SAN-TEST-01",
        name: "Santoshpur Branch Admin",
        email: "ba.santoshpur.test@designdec.internal",
        password: "Password@123",
        role: "Branch Admin",
        status: "Active",
        branch: "Santoshpur Branch",
      });
    } else {
      santoshpurBranchAdmin.role = "Branch Admin";
      santoshpurBranchAdmin.branch = "Santoshpur Branch";
      await santoshpurBranchAdmin.save();
    }

    let mainOfficeBranchAdmin = await User.findOne({
      email: "ba.mainoffice.test@designdec.internal",
    });
    if (!mainOfficeBranchAdmin) {
      mainOfficeBranchAdmin = await User.create({
        employeeId: "BA-MAIN-TEST-01",
        name: "Main Office Branch Admin",
        email: "ba.mainoffice.test@designdec.internal",
        password: "Password@123",
        role: "Branch Admin",
        status: "Active",
        branch: "Main Office",
      });
    } else {
      mainOfficeBranchAdmin.role = "Branch Admin";
      mainOfficeBranchAdmin.branch = "Main Office";
      await mainOfficeBranchAdmin.save();
    }

    let santoshpurEmployee = await User.findOne({
      email: "emp.santoshpur.rbac@designdec.internal",
    });
    if (!santoshpurEmployee) {
      santoshpurEmployee = await User.create({
        employeeId: "EMP-SAN-RBAC-01",
        name: "Santoshpur RBAC Worker",
        email: "emp.santoshpur.rbac@designdec.internal",
        password: "Password@123",
        role: "Employee",
        status: "Active",
        branch: "Santoshpur Branch",
      });
    } else {
      santoshpurEmployee.branch = "Santoshpur Branch";
      santoshpurEmployee.role = "Employee";
      await santoshpurEmployee.save();
    }

    let mainOfficeEmployee = await User.findOne({
      email: "emp.mainoffice.rbac@designdec.internal",
    });
    if (!mainOfficeEmployee) {
      mainOfficeEmployee = await User.create({
        employeeId: "EMP-MAIN-RBAC-01",
        name: "Main Office RBAC Worker",
        email: "emp.mainoffice.rbac@designdec.internal",
        password: "Password@123",
        role: "Employee",
        status: "Active",
        branch: "Main Office",
      });
    } else {
      mainOfficeEmployee.branch = "Main Office";
      mainOfficeEmployee.role = "Employee";
      await mainOfficeEmployee.save();
    }

    const adminToken = generateToken(admin._id);
    const baToken = generateToken(santoshpurBranchAdmin._id);
    const baMainToken = generateToken(mainOfficeBranchAdmin._id);
    const empToken = generateToken(santoshpurEmployee._id);

    console.log("\n--- TEST GROUP 1: Branch Admin Employee Management ---");

    // 1.1 Branch Admin creates employee for assigned branch (Santoshpur)
    const newEmpPayload = {
      name: "New Branch Worker",
      email: `new.worker.${Date.now()}@designdec.internal`,
      password: "Password@123",
      branch: "Santoshpur Branch",
      role: "Employee",
      department: "Production",
      designation: "Assembler",
      salary: 15000,
    };

    const createEmpRes = await fetch(`${BASE_URL}/employees`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${baToken}`,
      },
      body: JSON.stringify(newEmpPayload),
    });
    const createEmpData = await createEmpRes.json();
    assert(
      createEmpRes.status === 201,
      "Branch Admin CAN create employee for their assigned branch (201)",
      JSON.stringify(createEmpData)
    );
    const createdEmp = createEmpData.employee || createEmpData.data;
    assert(
      createdEmp?.branch === "Santoshpur Branch",
      "Created employee is strictly assigned to Branch Admin's branch"
    );
    const createdEmpId = createdEmp?._id;

    // 1.2 Branch Admin attempts to create employee for ANOTHER branch (Main Office)
    const crossBranchPayload = {
      name: "Illegal Cross Worker",
      email: `illegal.${Date.now()}@designdec.internal`,
      password: "Password@123",
      branch: "Main Office",
      role: "Employee",
    };
    const crossBranchRes = await fetch(`${BASE_URL}/employees`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${baToken}`,
      },
      body: JSON.stringify(crossBranchPayload),
    });
    assert(
      crossBranchRes.status === 403,
      "Branch Admin CANNOT create employee for another branch (403 Forbidden)"
    );

    // 1.3 Branch Admin attempts to elevate role during creation (e.g. role: 'Admin' or 'Branch Admin')
    const elevatedRolePayload = {
      name: "Illegal Admin Worker",
      email: `illegal.admin.${Date.now()}@designdec.internal`,
      password: "Password@123",
      branch: "Santoshpur Branch",
      role: "Admin",
    };
    const elevateRoleRes = await fetch(`${BASE_URL}/employees`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${baToken}`,
      },
      body: JSON.stringify(elevatedRolePayload),
    });
    assert(
      elevateRoleRes.status === 403,
      "Branch Admin CANNOT create users with elevated roles like Admin (403 Forbidden)"
    );

    // 1.4 Branch Admin GET /api/v1/employees (Branch Scoping)
    const getEmpsRes = await fetch(`${BASE_URL}/employees`, {
      headers: { Authorization: `Bearer ${baToken}` },
    });
    const getEmpsData = await getEmpsRes.json();
    assert(getEmpsRes.status === 200, "Branch Admin can GET employees (200)");
    const empsList = getEmpsData.employees || getEmpsData.data || [];
    const hasOtherBranchEmps = empsList.some((e) => e.branch && e.branch !== "Santoshpur Branch");
    assert(
      !hasOtherBranchEmps && empsList.length > 0,
      "Branch Admin employee list strictly isolated to Santoshpur Branch"
    );

    // 1.5 Branch Admin GET /api/v1/employees/:id
    const getOwnEmpRes = await fetch(`${BASE_URL}/employees/${santoshpurEmployee._id}`, {
      headers: { Authorization: `Bearer ${baToken}` },
    });
    assert(
      getOwnEmpRes.status === 200,
      "Branch Admin can view own branch employee details (200)"
    );

    const getOtherEmpRes = await fetch(`${BASE_URL}/employees/${mainOfficeEmployee._id}`, {
      headers: { Authorization: `Bearer ${baToken}` },
    });
    assert(
      getOtherEmpRes.status === 403,
      "Branch Admin CANNOT view another branch employee details (403 Forbidden)"
    );

    // 1.6 Branch Admin PUT /api/v1/employees/:id (Update)
    if (createdEmpId) {
      // Valid update
      const updateValidRes = await fetch(`${BASE_URL}/employees/${createdEmpId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${baToken}`,
        },
        body: JSON.stringify({ designation: "Senior Assembler" }),
      });
      assert(
        updateValidRes.status === 200,
        "Branch Admin can update employee of own branch (200)"
      );

      // Attempt to reassign branch
      const updateBranchRes = await fetch(`${BASE_URL}/employees/${createdEmpId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${baToken}`,
        },
        body: JSON.stringify({ branch: "Main Office" }),
      });
      assert(
        updateBranchRes.status === 403,
        "Branch Admin CANNOT reassign employee branch (403 Forbidden)"
      );

      // Attempt to elevate role
      const updateRoleRes = await fetch(`${BASE_URL}/employees/${createdEmpId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${baToken}`,
        },
        body: JSON.stringify({ role: "Branch Admin" }),
      });
      assert(
        updateRoleRes.status === 403,
        "Branch Admin CANNOT elevate employee role (403 Forbidden)"
      );
    }

    // Attempt to update employee of other branch
    const updateOtherEmpRes = await fetch(`${BASE_URL}/employees/${mainOfficeEmployee._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${baToken}`,
      },
      body: JSON.stringify({ designation: "Hacked" }),
    });
    assert(
      updateOtherEmpRes.status === 403,
      "Branch Admin CANNOT update employee of another branch (403 Forbidden)"
    );

    // 1.7 Branch Admin DELETE /api/v1/employees/:id
    const deleteOtherEmpRes = await fetch(`${BASE_URL}/employees/${mainOfficeEmployee._id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${baToken}` },
    });
    assert(
      deleteOtherEmpRes.status === 403,
      "Branch Admin CANNOT delete employee of another branch (403 Forbidden)"
    );

    const deletePeerBARes = await fetch(`${BASE_URL}/employees/${santoshpurBranchAdmin._id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${baToken}` },
    });
    assert(
      deletePeerBARes.status === 403,
      "Branch Admin CANNOT delete another Branch Admin/Manager (403 Forbidden)"
    );

    if (createdEmpId) {
      const deleteOwnEmpRes = await fetch(`${BASE_URL}/employees/${createdEmpId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${baToken}` },
      });
      assert(
        deleteOwnEmpRes.status === 200,
        "Branch Admin CAN delete employee belonging to own branch (200)"
      );
    }

    console.log("\n--- TEST GROUP 2: Branch Admin Attendance Report & Working Hours ---");

    // 2.1 Seed attendance records for testing work hours calculation
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const testAttRecord = await Attendance.findOneAndUpdate(
      { employee: santoshpurEmployee._id, attendanceDate: today },
      {
        employee: santoshpurEmployee._id,
        attendanceDate: today,
        attendanceStatus: "Present",
        workingHours: 8.5,
        overtimeHours: 0.5,
        checkIn: {
          time: new Date(today.getTime() + 9 * 60 * 60 * 1000), // 09:00
          location: { coordinates: [88.3639, 22.4989] },
          verified: true,
        },
        checkOut: {
          time: new Date(today.getTime() + 18 * 60 * 60 * 1000), // 18:00
          location: { coordinates: [88.3639, 22.4989] },
          verified: true,
        },
      },
      { upsert: true, new: true }
    );

    // 2.2 Branch Admin GET /api/v1/attendance/admin (Authorized & Scoped)
    const getAttAdminRes = await fetch(`${BASE_URL}/attendance/admin`, {
      headers: { Authorization: `Bearer ${baToken}` },
    });
    const getAttAdminData = await getAttAdminRes.json();
    assert(
      getAttAdminRes.status === 200,
      "Branch Admin is AUTHORIZED to access GET /api/v1/attendance/admin (200)",
      JSON.stringify(getAttAdminData)
    );
    const attRecords = getAttAdminData.data || [];
    assert(
      attRecords.length > 0,
      "Attendance report returns records for Branch Admin's branch"
    );

    // Verify work hours calculations exist in the response
    const matchedRecord = attRecords.find(
      (a) => String(a.employee?._id || a.employee) === String(santoshpurEmployee._id)
    );
    assert(
      matchedRecord && typeof matchedRecord.workingHours === "number",
      "Attendance record includes accurate workingHours calculation"
    );
    assert(
      typeof getAttAdminData.summary?.totalWorkingHours === "number",
      "Admin attendance report includes aggregated totalWorkingHours metric"
    );

    console.log("\n--- TEST GROUP 3: Branch Admin Attendance Correction Requests ---");

    // 3.1 Branch Admin GET /api/v1/attendance/correction-requests
    const getCorrectionsRes = await fetch(`${BASE_URL}/attendance/correction-requests`, {
      headers: { Authorization: `Bearer ${baToken}` },
    });
    const getCorrectionsData = await getCorrectionsRes.json();
    assert(
      getCorrectionsRes.status === 200,
      "Branch Admin can access GET /api/v1/attendance/correction-requests (200)"
    );

    // 3.2 Seed a pending correction request for Santoshpur Employee
    let sanCorrection = await AttendanceCorrection.create({
      employee: santoshpurEmployee._id,
      attendance: testAttRecord._id,
      attendanceDate: today,
      requestedCheckOutTime: new Date(today.getTime() + 19 * 60 * 60 * 1000),
      reason: "Forgot to check out at 7 PM",
      status: "Pending",
      auditTrail: [
        {
          action: "REQUEST_SUBMITTED",
          performedBy: santoshpurEmployee._id,
          performedByName: santoshpurEmployee.name,
          performedByRole: santoshpurEmployee.role,
          timestamp: new Date(),
        },
      ],
    });

    // 3.3 Santoshpur Branch Admin approves Santoshpur Employee request via PATCH
    const approveRes = await fetch(
      `${BASE_URL}/attendance/correction-requests/${sanCorrection._id}/approve`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${baToken}`,
        },
        body: JSON.stringify({ remarks: "Approved by Branch Admin" }),
      }
    );
    const approveData = await approveRes.json();
    assert(
      approveRes.status === 200,
      "Branch Admin CAN approve correction request for their branch employee (200)",
      JSON.stringify(approveData)
    );

    // 3.4 Seed a correction request for Main Office Employee
    const mainAttRecord = await Attendance.findOneAndUpdate(
      { employee: mainOfficeEmployee._id, attendanceDate: today },
      {
        employee: mainOfficeEmployee._id,
        attendanceDate: today,
        attendanceStatus: "Present",
        checkIn: {
          time: new Date(today.getTime() + 9 * 60 * 60 * 1000),
          location: { coordinates: [88.4312, 22.5697] },
          verified: true,
        },
      },
      { upsert: true, new: true }
    );

    let mainCorrection = await AttendanceCorrection.create({
      employee: mainOfficeEmployee._id,
      attendance: mainAttRecord._id,
      attendanceDate: today,
      requestedCheckOutTime: new Date(today.getTime() + 18 * 60 * 60 * 1000),
      reason: "Main Office forgot checkout",
      status: "Pending",
      auditTrail: [
        {
          action: "REQUEST_SUBMITTED",
          performedBy: mainOfficeEmployee._id,
          performedByName: mainOfficeEmployee.name,
          performedByRole: mainOfficeEmployee.role,
          timestamp: new Date(),
        },
      ],
    });

    // 3.5 Santoshpur Branch Admin attempts to approve Main Office request -> 403 Forbidden
    const crossApproveRes = await fetch(
      `${BASE_URL}/attendance/correction-requests/${mainCorrection._id}/approve`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${baToken}`,
        },
        body: JSON.stringify({ remarks: "Cross branch illegal approve" }),
      }
    );
    assert(
      crossApproveRes.status === 403,
      "Branch Admin CANNOT approve correction request of another branch (403 Forbidden)"
    );

    // Clean up test correction
    await AttendanceCorrection.deleteMany({
      _id: { $in: [sanCorrection._id, mainCorrection._id] },
    });

    console.log("\n--- TEST GROUP 4: Branch Admin Dashboard Statistics & Scoping ---");

    // 4.1 Branch Admin GET /api/v1/dashboard
    const getStatsRes = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Authorization: `Bearer ${baToken}` },
    });
    const getStatsData = await getStatsRes.json();
    assert(
      getStatsRes.status === 200,
      "Branch Admin can GET /api/v1/dashboard (200)"
    );
    assert(
      getStatsData.success === true,
      "Dashboard statistics response indicates success"
    );
    assert(
      typeof getStatsData.data?.orders?.totalOrders === "number",
      "Dashboard includes totalOrders count"
    );
    assert(
      typeof getStatsData.data?.financials?.totalOrderValue === "number",
      "Dashboard includes totalOrderValue (monthly earnings calculation)"
    );
    assert(
      typeof getStatsData.data?.attendance?.totalActiveEmployees === "number",
      "Dashboard includes totalActiveEmployees count"
    );

    console.log("\n===================================================================");
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("===================================================================");

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error("Test execution failed with error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
