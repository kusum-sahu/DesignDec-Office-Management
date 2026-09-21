import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import AttendanceCorrection from "../models/AttendanceCorrection.js";
import Attendance from "../models/Attendance.js";
import User from "../models/User.js";

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  const corrections = await AttendanceCorrection.find({})
    .populate("employee", "name email role branch")
    .populate("correctedBy", "name email role")
    .lean();

  console.log(`\nTotal Correction Requests: ${corrections.length}`);
  for (const c of corrections) {
    console.log(
      `ID: ${c._id} | Employee: ${c.employee?.name} (${c.employee?.role}, ${c.employee?.branch}) | Status: ${c.status} | Date: ${c.attendanceDate?.toISOString()} | ReqOut: ${c.requestedCheckOutTime?.toISOString()} | Reason: ${c.reason}`
    );
  }

  const incomplete = await Attendance.find({
    "checkIn.time": { $exists: true, $ne: null },
    $or: [{ "checkOut.time": null }, { "checkOut.time": { $exists: false } }],
  })
    .populate("employee", "name email role branch")
    .lean();

  console.log(`\nTotal Incomplete Attendances (checkIn exists, checkOut null): ${incomplete.length}`);
  for (const a of incomplete) {
    console.log(
      `ID: ${a._id} | Employee: ${a.employee?.name} (${a.employee?.branch}) | Date: ${a.attendanceDate?.toISOString()} | hasPending: ${a.hasPendingCorrection}`
    );
  }

  const users = await User.find({ status: "Active" }).select("name email role branch designation").lean();
  console.log(`\nActive Users: ${users.length}`);
  for (const u of users) {
    console.log(`User: ${u.name} | Email: ${u.email} | Role: ${u.role} | Branch: ${u.branch} | Designation: ${u.designation}`);
  }

  await mongoose.disconnect();
}

check().catch(console.error);
