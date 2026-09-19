import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import fs from "fs";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import AttendanceSetting from "../models/AttendanceSetting.js";
import AttendanceCorrection from "../models/AttendanceCorrection.js";

const BASE_URL = `http://localhost:${process.env.PORT || 5000}/api/v1`;

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

async function runTests() {
  console.log("===================================================================");
  console.log("🛠️ RUNNING INCOMPLETE ATTENDANCE DETECTION & CORRECTION WORKFLOW TESTS");
  console.log("===================================================================");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

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

  // Create dummy image file for multipart upload
  const dummyPhotoPath = path.resolve("./dummy_correction_photo.jpg");
  fs.writeFileSync(dummyPhotoPath, "dummy photo content");

  try {
    // 1. Fixtures: Admin, Santoshpur Branch Manager, Main Office Employee
    let admin = await User.findOne({ role: "Admin" });
    if (!admin) throw new Error("No admin found!");

    let branchManager = await User.findOne({
      email: "bm.santoshpur.test@designdec.internal",
    });
    if (!branchManager) {
      branchManager = await User.create({
        employeeId: "BM-TEST-01",
        name: "Santoshpur Branch Manager",
        email: "bm.santoshpur.test@designdec.internal",
        password: "Password@123",
        role: "Branch Manager",
        status: "Active",
        branch: "Santoshpur Branch",
      });
    } else {
      branchManager.branch = "Santoshpur Branch";
      branchManager.role = "Branch Manager";
      await branchManager.save();
    }

    let santoshpurEmployee = await User.findOne({
      email: "emp.santoshpur.test@designdec.internal",
    });
    if (!santoshpurEmployee) {
      santoshpurEmployee = await User.create({
        employeeId: "EMP-TEST-01",
        name: "Santoshpur Worker",
        email: "emp.santoshpur.test@designdec.internal",
        password: "Password@123",
        role: "Employee",
        status: "Active",
        branch: "Santoshpur Branch",
      });
    }

    let mainOfficeEmployee = await User.findOne({
      email: "emp.mainoffice.test@designdec.internal",
    });
    if (!mainOfficeEmployee) {
      mainOfficeEmployee = await User.create({
        employeeId: "EMP-TEST-02",
        name: "Main Office Worker",
        email: "emp.mainoffice.test@designdec.internal",
        password: "Password@123",
        role: "Employee",
        status: "Active",
        branch: "Main Office",
      });
    }

    const adminToken = generateToken(admin._id);
    const bmToken = generateToken(branchManager._id);
    const empToken = generateToken(santoshpurEmployee._id);
    const mainOfficeEmpToken = generateToken(mainOfficeEmployee._id);

    // Clean up test data for these employees
    await Attendance.deleteMany({
      employee: { $in: [santoshpurEmployee._id, mainOfficeEmployee._id] },
    });
    await AttendanceCorrection.deleteMany({
      employee: { $in: [santoshpurEmployee._id, mainOfficeEmployee._id] },
    });

    console.log("\n--- TEST GROUP 1: Incomplete Previous-Day Attendance Detection ---");

    // Seed yesterday's incomplete attendance (checked in at 09:30 AM, never checked out)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const yesterdayCheckIn = new Date(yesterday);
    yesterdayCheckIn.setHours(9, 30, 0, 0);

    const incompleteYesterday = await Attendance.create({
      employee: santoshpurEmployee._id,
      attendanceDate: yesterday,
      checkIn: {
        time: yesterdayCheckIn,
        location: { latitude: 19.3524, longitude: 84.8512, address: "Santoshpur Branch" },
        photo: "uploads/dummy.jpg",
      },
      checkOut: { time: null }, // MISSING CHECKOUT!
      workingHours: 0,
      shift: "General",
      attendanceStatus: "Present",
    });

    // Test GET /today detects incomplete yesterday attendance
    const todayRes = await fetch(`${BASE_URL}/attendance/today`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const todayData = await todayRes.json();

    assert(todayRes.status === 200, "GET /attendance/today returns 200");
    assert(
      todayData.incompletePreviousAttendance !== null,
      "incompletePreviousAttendance is detected",
      JSON.stringify(todayData.incompletePreviousAttendance)
    );
    assert(
      todayData.warning && todayData.warning.includes("You didn’t check out on"),
      "Warning message contains: 'You didn’t check out on [date]. Please submit a correction request.'",
      todayData.warning
    );

    console.log("\n--- TEST GROUP 2: Today Check-In Is NOT Blocked by Incomplete Previous Attendance ---");

    // Perform today's check-in via multipart form data using Santoshpur coordinates
    const setting = await AttendanceSetting.findOne({ isActive: true });
    const santoshpurBranch = setting?.branchLocations?.find((b) => b.branchName === "Santoshpur Branch") || {
      latitude: 20.2588,
      longitude: 85.7884,
    };

    const formData = new FormData();
    const photoBlob = new Blob([fs.readFileSync(dummyPhotoPath)], { type: "image/jpeg" });
    formData.append("photo", photoBlob, "selfie.jpg");
    formData.append("latitude", String(santoshpurBranch.latitude));
    formData.append("longitude", String(santoshpurBranch.longitude));
    formData.append("address", "Santoshpur Office");

    const checkInRes = await fetch(`${BASE_URL}/attendance/check-in`, {
      method: "POST",
      headers: { Authorization: `Bearer ${empToken}` },
      body: formData,
    });
    const checkInData = await checkInRes.json();

    assert(checkInRes.status === 201, "Check-in succeeds with 201 Created without blocking", checkInData.message);
    assert(checkInData.data?.checkInTime !== undefined, "Today's check-in record was successfully saved");
    assert(
      checkInData.incompletePreviousAttendance !== null,
      "Check-in response still returns incomplete previous attendance details"
    );
    assert(
      checkInData.warning && checkInData.warning.includes("Please submit a correction request"),
      "Check-in response provides clear warning to employee without having blocked them"
    );

    console.log("\n--- TEST GROUP 3: Employee Correction Request Submission ---");

    // 1. Submit without reason -> should fail 400
    const failRes1 = await fetch(`${BASE_URL}/attendance/correction-request`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${empToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        attendanceId: incompleteYesterday._id,
        requestedCheckOutTime: new Date(yesterday.getTime() + 18 * 3600 * 1000).toISOString(),
        reason: "",
      }),
    });
    assert(failRes1.status === 400, "Submission without reason fails with 400");

    // 2. Submit with checkout time earlier than checkin -> should fail 400
    const failRes2 = await fetch(`${BASE_URL}/attendance/correction-request`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${empToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        attendanceId: incompleteYesterday._id,
        requestedCheckOutTime: new Date(yesterday.getTime() + 8 * 3600 * 1000).toISOString(), // 8:00 AM (before 9:30 AM)
        reason: "Forgot to check out",
      }),
    });
    assert(failRes2.status === 400, "Submission with checkout earlier than checkin fails with 400");

    // 3. Valid submission (checkout at 6:30 PM yesterday)
    const validCheckOutTime = new Date(yesterday);
    validCheckOutTime.setHours(18, 30, 0, 0);

    const submitRes = await fetch(`${BASE_URL}/attendance/correction-request`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${empToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        attendanceId: incompleteYesterday._id,
        requestedCheckOutTime: validCheckOutTime.toISOString(),
        reason: "Device battery died before leaving the site.",
      }),
    });
    const submitData = await submitRes.json();

    assert(submitRes.status === 201, "Valid correction request submitted with 201 Created", submitData.message);
    assert(submitData.data?.status === "Pending", "Correction request status is 'Pending'");
    assert(
      submitData.data?.auditTrail?.length === 1 &&
        submitData.data.auditTrail[0].action === "REQUEST_SUBMITTED",
      "Audit trail records initial REQUEST_SUBMITTED action"
    );

    const correctionId = submitData.data._id;

    // 3b. Verify that after submitting correction request, warning alert disappears!
    const todayAfterSubmitRes = await fetch(`${BASE_URL}/attendance/today`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const todayAfterSubmitData = await todayAfterSubmitRes.json();
    assert(
      todayAfterSubmitData.incompletePreviousAttendance === null,
      "Warning alert disappears: incompletePreviousAttendance is now null after submitting correction request"
    );
    assert(
      todayAfterSubmitData.warning === null,
      "Warning message is null after submitting correction request"
    );

    // 3c. Verify GET /attendance/incomplete marks record as pending and warningMessage as null
    const incompleteListRes = await fetch(`${BASE_URL}/attendance/incomplete`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const incompleteListData = await incompleteListRes.json();
    const incompleteItem = incompleteListData.data?.find(
      (r) => String(r._id) === String(incompleteYesterday._id)
    );
    assert(
      incompleteItem?.hasPendingCorrection === true,
      "Incomplete record list shows hasPendingCorrection: true"
    );
    assert(
      incompleteItem?.warningMessage === null,
      "Incomplete record warningMessage is null once pending"
    );

    // 4. Duplicate submission check -> should fail with 400
    const dupRes = await fetch(`${BASE_URL}/attendance/correction-request`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${empToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        attendanceId: incompleteYesterday._id,
        requestedCheckOutTime: validCheckOutTime.toISOString(),
        reason: "Another request attempt",
      }),
    });
    assert(dupRes.status === 400, "Duplicate pending request for same attendance fails with 400");

    console.log("\n--- TEST GROUP 4: Role-Based Access Control (Branch Manager Scoping) ---");

    // Create an incomplete attendance for Main Office employee
    const mainOfficeIncomplete = await Attendance.create({
      employee: mainOfficeEmployee._id,
      attendanceDate: yesterday,
      checkIn: {
        time: yesterdayCheckIn,
        location: { latitude: 19.3149, longitude: 84.794, address: "Main Office" },
        photo: "uploads/dummy2.jpg",
      },
      checkOut: { time: null },
      workingHours: 0,
      shift: "General",
      attendanceStatus: "Present",
    });

    const mainOfficeSubmitRes = await fetch(`${BASE_URL}/attendance/correction-request`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mainOfficeEmpToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        attendanceId: mainOfficeIncomplete._id,
        requestedCheckOutTime: validCheckOutTime.toISOString(),
        reason: "Main office power outage at closing.",
      }),
    });
    const mainOfficeSubmitData = await mainOfficeSubmitRes.json();
    const mainOfficeCorrectionId = mainOfficeSubmitData.data._id;

    // Santoshpur Branch Manager trying to approve Main Office request -> should be 403
    const unauthorizedApprove = await fetch(
      `${BASE_URL}/attendance/correction-requests/${mainOfficeCorrectionId}/approve`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${bmToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ actionReason: "Trying to approve other branch" }),
      }
    );
    assert(unauthorizedApprove.status === 403, "Branch Manager cannot approve correction request of another branch (403)");

    console.log("\n--- TEST GROUP 5: Approval Flow with correctedBy, correctedAt, and Audit Trail ---");

    // Santoshpur Branch Manager approves Santoshpur employee's correction request
    const approveRes = await fetch(
      `${BASE_URL}/attendance/correction-requests/${correctionId}/approve`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${bmToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ actionReason: "Verified with branch CCTV." }),
      }
    );
    const approveData = await approveRes.json();

    assert(approveRes.status === 200, "Branch Manager approves their branch employee request (200)");
    assert(approveData.data?.correction?.status === "Approved", "Request status updated to 'Approved'");
    assert(
      approveData.data?.correction?.correctedBy === branchManager._id.toString(),
      "correctedBy is recorded with Branch Manager's ID"
    );
    assert(
      Boolean(approveData.data?.correction?.correctedAt),
      "correctedAt timestamp is recorded"
    );
    assert(
      approveData.data?.correction?.auditTrail?.length === 2 &&
        approveData.data.correction.auditTrail[1].action === "APPROVED",
      "Audit trail records APPROVED action by Branch Manager with full details"
    );

    // Verify Attendance document itself is updated accurately
    const updatedAttendance = await Attendance.findById(incompleteYesterday._id);
    assert(
      updatedAttendance.checkOut?.time !== null,
      "Attendance checkOut.time is now populated with requested time"
    );
    assert(
      updatedAttendance.workingHours > 0,
      `Working hours accurately calculated: ${updatedAttendance.workingHours}h`
    );
    assert(
      updatedAttendance.isManual === true,
      "Attendance isManual flag set to true"
    );
    assert(
      updatedAttendance.correctedBy?.toString() === branchManager._id.toString(),
      "Attendance correctedBy matches Branch Manager"
    );
    assert(
      updatedAttendance.hasPendingCorrection === false,
      "hasPendingCorrection is cleared on Attendance"
    );

    console.log("\n--- TEST GROUP 6: Rejection Flow with Reason & Audit Trail ---");

    // 1. Admin rejects Main Office request without reason -> should fail with 400
    const failReject = await fetch(
      `${BASE_URL}/attendance/correction-requests/${mainOfficeCorrectionId}/reject`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: "" }),
      }
    );
    assert(failReject.status === 400, "Rejection without reason fails with 400");

    // 2. Admin rejects Main Office request with reason -> should succeed with 200
    const rejectRes = await fetch(
      `${BASE_URL}/attendance/correction-requests/${mainOfficeCorrectionId}/reject`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: "Branch security log confirms employee left at 1:00 PM." }),
      }
    );
    const rejectData = await rejectRes.json();

    assert(rejectRes.status === 200, "Admin rejects correction request with reason (200)");
    assert(rejectData.data?.status === "Rejected", "Request status updated to 'Rejected'");
    assert(
      rejectData.data?.actionReason === "Branch security log confirms employee left at 1:00 PM.",
      "actionReason stores rejection reason"
    );
    assert(
      rejectData.data?.auditTrail?.length === 2 &&
        rejectData.data.auditTrail[1].action === "REJECTED",
      "Audit trail records REJECTED action with reasons"
    );

    // Verify Main Office Attendance document checkOut.time is STILL null (no fake checkout!)
    const rejectedAttendance = await Attendance.findById(mainOfficeIncomplete._id);
    assert(
      rejectedAttendance.checkOut?.time === null,
      "Rejected attendance checkOut.time remains null - NEVER fake auto-checked out"
    );

    console.log("\n===================================================================");
    console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log("===================================================================");
  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    if (fs.existsSync(dummyPhotoPath)) fs.unlinkSync(dummyPhotoPath);
    await mongoose.disconnect();
    process.exit(failed === 0 ? 0 : 1);
  }
}

runTests();
