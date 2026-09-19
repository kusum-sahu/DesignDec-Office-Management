import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import AttendanceSetting from "../models/AttendanceSetting.js";

async function updateSantoshpurLocation() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  let setting = await AttendanceSetting.findOne({ isActive: true });
  if (!setting) {
    setting = new AttendanceSetting({});
  }

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

  await setting.save();
  console.log("Updated AttendanceSetting with real Santoshpur coordinates:", JSON.stringify(setting.branchLocations, null, 2));

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

updateSantoshpurLocation();
