import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import fs from "fs";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import AttendanceSetting from "../models/AttendanceSetting.js";

const BASE_URL = `http://localhost:${process.env.PORT || 5000}/api/v1`;

async function testFullFlow() {
  await mongoose.connect(process.env.MONGO_URI, { family: 4, serverSelectionTimeoutMS: 10000 });
  console.log("Connected to MongoDB.");

  const dummyPhotoPath = path.resolve("dummy_test_photo.jpg");
  fs.writeFileSync(dummyPhotoPath, "fake image bytes for testing");

  const simran = await User.findOne({ name: /Simran/i });
  const token = jwt.sign({ id: simran._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

  // Clean any attendance today for test repeatability
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  await Attendance.deleteMany({ employee: simran._id, attendanceDate: { $gte: startOfToday, $lte: endOfToday } });

  // 1. Check-In with poor accuracy (50,000m) -> Rejected (400 GPS_ACCURACY_TOO_LOW)
  console.log("\n1. Testing Check-In with poor accuracy (50,000m)...");
  const formPoor = new FormData();
  formPoor.append("photo", new Blob([fs.readFileSync(dummyPhotoPath)], { type: "image/jpeg" }), "selfie.jpg");
  formPoor.append("latitude", "20.24210");
  formPoor.append("longitude", "85.85430");
  formPoor.append("accuracy", "50000");

  const resPoor = await fetch(`${BASE_URL}/attendance/check-in`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formPoor,
  });
  const dataPoor = await resPoor.json();
  console.log("Check-in (poor accuracy):", { status: resPoor.status, code: dataPoor.code, message: dataPoor.message });

  // 2. Check-In with accurate location outside radius (7km) -> Rejected (403 OUTSIDE_GEOFENCE)
  console.log("\n2. Testing Check-In with accurate location but outside radius (7km)...");
  const formOutside = new FormData();
  formOutside.append("photo", new Blob([fs.readFileSync(dummyPhotoPath)], { type: "image/jpeg" }), "selfie.jpg");
  formOutside.append("latitude", "20.24210");
  formOutside.append("longitude", "85.85430");
  formOutside.append("accuracy", "15");

  const resOutside = await fetch(`${BASE_URL}/attendance/check-in`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formOutside,
  });
  const dataOutside = await resOutside.json();
  console.log("Check-in (outside radius):", { status: resOutside.status, code: dataOutside.code, distance: dataOutside.distance });

  // 3. Check-In with accurate location inside radius (3m) -> Accepted (201)
  console.log("\n3. Testing Check-In with accurate location within radius (3m)...");
  const formInside = new FormData();
  formInside.append("photo", new Blob([fs.readFileSync(dummyPhotoPath)], { type: "image/jpeg" }), "selfie.jpg");
  formInside.append("latitude", "20.25882");
  formInside.append("longitude", "85.78842");
  formInside.append("accuracy", "12");

  const resInside = await fetch(`${BASE_URL}/attendance/check-in`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formInside,
  });
  const dataInside = await resInside.json();
  console.log("Check-in (inside radius):", { status: resInside.status, success: dataInside.success });

  // 4. Check-Out with poor accuracy (50,000m) -> Rejected (400 GPS_ACCURACY_TOO_LOW)
  console.log("\n4. Testing Check-Out with poor accuracy (50,000m)...");
  const formOutPoor = new FormData();
  formOutPoor.append("photo", new Blob([fs.readFileSync(dummyPhotoPath)], { type: "image/jpeg" }), "selfie.jpg");
  formOutPoor.append("latitude", "20.24210");
  formOutPoor.append("longitude", "85.85430");
  formOutPoor.append("accuracy", "50000");

  const resOutPoor = await fetch(`${BASE_URL}/attendance/check-out`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formOutPoor,
  });
  const dataOutPoor = await resOutPoor.json();
  console.log("Check-out (poor accuracy):", { status: resOutPoor.status, code: dataOutPoor.code, message: dataOutPoor.message });

  // 5. Check-Out with accurate location inside radius (3m) -> Accepted (200)
  console.log("\n5. Testing Check-Out with accurate location inside radius (3m)...");
  const formOutInside = new FormData();
  formOutInside.append("photo", new Blob([fs.readFileSync(dummyPhotoPath)], { type: "image/jpeg" }), "selfie.jpg");
  formOutInside.append("latitude", "20.25882");
  formOutInside.append("longitude", "85.78842");
  formOutInside.append("accuracy", "10");

  const resOutInside = await fetch(`${BASE_URL}/attendance/check-out`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formOutInside,
  });
  const dataOutInside = await resOutInside.json();
  console.log("Check-out (inside radius):", { status: resOutInside.status, success: dataOutInside.success, workingHours: dataOutInside.data?.workingHours });

  // 6. Verify office coordinates in DB were NEVER overwritten!
  const settingFinal = await AttendanceSetting.findOne({ isActive: true }).lean();
  const santoshpurFinal = settingFinal.branchLocations.find((b) => b.branchName === "Santoshpur Branch");
  console.log("\n6. Santoshpur Branch coordinates in DB after all tests:", {
    lat: santoshpurFinal.latitude,
    lng: santoshpurFinal.longitude,
    radius: santoshpurFinal.radius
  });

  // Cleanup
  if (fs.existsSync(dummyPhotoPath)) fs.unlinkSync(dummyPhotoPath);
  await Attendance.deleteMany({ employee: simran._id, attendanceDate: { $gte: startOfToday, $lte: endOfToday } });
  console.log("Cleaned test attendance records and dummy photo.");

  await mongoose.disconnect();
}

testFullFlow().catch(console.error);
