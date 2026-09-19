import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import Attendance from "../models/Attendance.js";
import User from "../models/User.js";

async function cleanTodayAttendance() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const recs = await Attendance.find({
    attendanceDate: { $gte: startOfToday, $lte: endOfToday },
  }).populate("employee", "name email role employeeId");

  console.log(`Found ${recs.length} attendance record(s) for today:`);
  for (const r of recs) {
    console.log(`- ID: ${r._id}, Employee: ${r.employee?.name} (${r.employee?.email}), CheckIn: ${r.checkIn?.time}, CheckOut: ${r.checkOut?.time}`);
  }

  // Delete today's attendance records so the user can fresh check-in
  const result = await Attendance.deleteMany({
    attendanceDate: { $gte: startOfToday, $lte: endOfToday },
  });

  console.log(`Deleted ${result.deletedCount} attendance record(s) for today.`);

  // Restore Simran Sahu's assigned branch
  const simran = await User.findOne({ email: "simransahu1218@gmail.com" });
  if (simran) {
    simran.branch = "Santoshpur Branch";
    await simran.save();
    console.log("Verified Simran Sahu assigned branch:", simran.branch);
  }

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

cleanTodayAttendance();
