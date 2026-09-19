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
import { calculateDistanceMeters } from "../utils/geofence.js";

const BASE_URL = `http://localhost:${process.env.PORT || 5000}/api/v1`;

const generateTestToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

async function runGeofenceTests() {
  console.log("=================================================");
  console.log("🧭 RUNNING ATTENDANCE GEOFENCE & 409 PREVENTION TESTS");
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

  // Create dummy image file for multipart upload
  const dummyPhotoPath = path.resolve("./dummy_test_photo.jpg");
  fs.writeFileSync(dummyPhotoPath, "fake image bytes for testing");

  try {
    // 1. Fetch Admin and Employee users
    const adminUser = await User.findOne({ role: "Admin" });
    if (!adminUser) throw new Error("No Admin user found in database!");

    let employeeUser = await User.findOne({ email: "geofence.test.runner@designdec.internal" });
    if (!employeeUser) {
      employeeUser = await User.create({
        employeeId: "TEST-BOT-99",
        name: "Geofence Automated Bot",
        email: "geofence.test.runner@designdec.internal",
        password: "Password@123",
        role: "Employee",
        status: "Active",
        branch: "Main Office",
      });
    } else {
      employeeUser.branch = "Main Office";
      await employeeUser.save();
    }

    const adminToken = generateTestToken(adminUser._id);
    const employeeToken = generateTestToken(employeeUser._id);

    // ==========================================
    // TEST 1: Haversine Calculation Accuracy
    // ==========================================
    console.log("\n--- TEST SUITE 1: Haversine Unit Calculations ---");
    // Main Office: 19.314962, 84.794091
    // Point ~50m away: 19.315350, 84.794250
    const distNear = calculateDistanceMeters(19.314962, 84.794091, 19.315350, 84.794250);
    assert(distNear < 100, "Near point is within 100m", `Distance: ${distNear}m`);

    // Point far away (Santoshpur branch ~7.2km): 19.352400, 84.851200
    const distFar = calculateDistanceMeters(19.314962, 84.794091, 19.352400, 84.851200);
    assert(distFar > 5000, "Santoshpur is >5km from Main Office", `Distance: ${distFar}m`);

    // ==========================================
    // TEST 2: GET /attendance/settings
    // ==========================================
    console.log("\n--- TEST SUITE 2: Settings & Geofence Coordinates ---");
    const settingsRes = await fetch(`${BASE_URL}/attendance/settings`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    const settingsData = await settingsRes.json();
    assert(settingsRes.status === 200, "GET /attendance/settings returns 200 OK");
    assert(
      Array.isArray(settingsData.data?.branchLocations) && settingsData.data.branchLocations.length >= 2,
      "Branch locations include Main Office and Santoshpur Branch"
    );

    const mainOfficeConfig = settingsData.data?.branchLocations?.find(
      (b) => b.branchName === "Main Office"
    );
    assert(
      mainOfficeConfig && mainOfficeConfig.radius === 200,
      "Main Office configured with 200m radius"
    );

    // ==========================================
    // TEST 3: GET /attendance/today (Single Source of Truth)
    // ==========================================
    console.log("\n--- TEST SUITE 3: GET /attendance/today ---");
    const todayRes = await fetch(`${BASE_URL}/attendance/today`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    const todayData = await todayRes.json();
    assert(todayRes.status === 200, "GET /attendance/today returns 200 OK");
    assert(todayData.success === true, "Today response has success: true");

    // ==========================================
    // TEST 4: Check-in Outside 200m Radius -> 403 Forbidden
    // ==========================================
    console.log("\n--- TEST SUITE 4: Check-in Geofencing Enforcement ---");
    // Ensure clean state for today's test
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    await Attendance.deleteMany({
      employee: employeeUser._id,
      attendanceDate: { $gte: startOfToday, $lte: endOfToday },
    });

    // Attempt Check-in with location 10km away from Main Office
    const formDataOutside = new FormData();
    formDataOutside.append("latitude", "19.414962");
    formDataOutside.append("longitude", "84.894091");
    formDataOutside.append("address", "Far Away Outside Office");
    formDataOutside.append(
      "photo",
      new Blob([fs.readFileSync(dummyPhotoPath)], { type: "image/jpeg" }),
      "test.jpg"
    );

    const outsideRes = await fetch(`${BASE_URL}/attendance/check-in`, {
      method: "POST",
      headers: { Authorization: `Bearer ${employeeToken}` },
      body: formDataOutside,
    });
    const outsideData = await outsideRes.json();
    assert(outsideRes.status === 403, "Check-in outside 200m returns 403 Forbidden", `Status: ${outsideRes.status}`);
    assert(
      outsideData.message && outsideData.message.includes("outside the office radius"),
      "403 message explains user is outside office radius",
      outsideData.message
    );
    assert(outsideData.allowedRadius === 200, "Response specifies allowedRadius = 200m");

    // ==========================================
    // TEST 5: Check-in Inside 200m Radius -> 201 Created
    // ==========================================
    console.log("\n--- TEST SUITE 5: Check-in Inside 200m Radius ---");
    const formDataInside = new FormData();
    formDataInside.append("latitude", "19.314962"); // Exact Main Office
    formDataInside.append("longitude", "84.794091");
    formDataInside.append("address", "Main Office, Berhampur");
    formDataInside.append(
      "photo",
      new Blob([fs.readFileSync(dummyPhotoPath)], { type: "image/jpeg" }),
      "test.jpg"
    );

    const insideRes = await fetch(`${BASE_URL}/attendance/check-in`, {
      method: "POST",
      headers: { Authorization: `Bearer ${employeeToken}` },
      body: formDataInside,
    });
    const insideData = await insideRes.json();
    assert(
      insideRes.status === 200 || insideRes.status === 201,
      "Check-in inside 200m returns 201 Created / 200 OK",
      `Status: ${insideRes.status}`
    );
    assert(insideData.success === true, "Check-in response reports success: true");

    // Verify GET /today now returns this check-in!
    const todayAfterCheckInRes = await fetch(`${BASE_URL}/attendance/today`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    const todayAfterCheckInData = await todayAfterCheckInRes.json();
    assert(
      Boolean(todayAfterCheckInData.data?.checkIn?.time),
      "GET /today immediately returns active checkIn after punching in"
    );

    // ==========================================
    // TEST 6: Duplicate Check-in -> 409 Conflict with action: "CHECK_OUT"
    // ==========================================
    console.log("\n--- TEST SUITE 6: Duplicate Check-in Prevention (409 Conflict) ---");
    const duplicateRes = await fetch(`${BASE_URL}/attendance/check-in`, {
      method: "POST",
      headers: { Authorization: `Bearer ${employeeToken}` },
      body: formDataInside,
    });
    const duplicateData = await duplicateRes.json();
    assert(duplicateRes.status === 409, "Duplicate check-in returns 409 Conflict", `Status: ${duplicateRes.status}`);
    assert(
      duplicateData.action === "CHECK_OUT",
      "409 response includes action: 'CHECK_OUT' to guide UI",
      `Action: ${duplicateData.action}`
    );

    // ==========================================
    // TEST 7: Check-out Geofencing Enforcement
    // ==========================================
    console.log("\n--- TEST SUITE 7: Check-out Geofencing Enforcement ---");
    // Attempt Check-out outside 200m radius
    const checkoutOutsideRes = await fetch(`${BASE_URL}/attendance/check-out`, {
      method: "POST",
      headers: { Authorization: `Bearer ${employeeToken}` },
      body: formDataOutside,
    });
    const checkoutOutsideData = await checkoutOutsideRes.json();
    assert(
      checkoutOutsideRes.status === 403,
      "Check-out outside 200m returns 403 Forbidden",
      `Status: ${checkoutOutsideRes.status}`
    );

    // Attempt Check-out inside 200m radius
    const checkoutInsideRes = await fetch(`${BASE_URL}/attendance/check-out`, {
      method: "POST",
      headers: { Authorization: `Bearer ${employeeToken}` },
      body: formDataInside,
    });
    const checkoutInsideData = await checkoutInsideRes.json();
    assert(
      checkoutInsideRes.status === 200,
      "Check-out inside 200m returns 200 OK",
      `Status: ${checkoutInsideRes.status}`
    );

    // Verify GET /today now returns checkedOut
    const todayAfterCheckOutRes = await fetch(`${BASE_URL}/attendance/today`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    const todayAfterCheckOutData = await todayAfterCheckOutRes.json();
    assert(
      Boolean(todayAfterCheckOutData.data?.checkOut?.time),
      "GET /today returns checkOut.time after checking out"
    );

    // ==========================================
    // TEST 8: Admin Geofence Update API
    // ==========================================
    console.log("\n--- TEST SUITE 8: Admin Geofence Management ---");
    // Non-admin attempt -> 403
    const nonAdminUpdateRes = await fetch(`${BASE_URL}/attendance/settings/branch-location`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        branchName: "Santoshpur Branch",
        latitude: 20.25880,
        longitude: 85.78840,
        radius: 200,
      }),
    });
    assert(nonAdminUpdateRes.status === 403, "Non-admin update geofence is rejected with 403");

    // Admin attempt -> 200
    const adminUpdateRes = await fetch(`${BASE_URL}/attendance/settings/branch-location`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        branchName: "Santoshpur Branch",
        latitude: 20.25880,
        longitude: 85.78840,
        radius: 200,
        address: "Santoshpur Branch, Odisha - Calibrated",
      }),
    });
    const adminUpdateData = await adminUpdateRes.json();
    assert(adminUpdateRes.status === 200, "Admin can calibrate and update branch geofence (200 OK)");

  } catch (err) {
    console.error("Test Suite Execution Error:", err);
    failed++;
  } finally {
    if (fs.existsSync(dummyPhotoPath)) {
      fs.unlinkSync(dummyPhotoPath);
    }
    try {
      const testBot = await User.findOne({ email: "geofence.test.runner@designdec.internal" });
      if (testBot) {
        await Attendance.deleteMany({ employee: testBot._id });
        await User.findByIdAndDelete(testBot._id);
      }
    } catch (cleanErr) {
      console.error("Cleanup error:", cleanErr);
    }
    await mongoose.disconnect();
  }

  console.log("\n=================================================");
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");
  process.exit(failed > 0 ? 1 : 0);
}

runGeofenceTests();
