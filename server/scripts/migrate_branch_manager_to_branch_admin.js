import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";

async function runMigration() {
  console.log("=== Migrating 'Branch Manager' to 'Branch Admin' ===");
  try {
    await connectDB();

    const result = await User.updateMany(
      { role: "Branch Manager" },
      { $set: { role: "Branch Admin" } }
    );

    console.log(`Updated ${result.modifiedCount} user(s) from 'Branch Manager' to 'Branch Admin'.`);

    const branchAdmins = await User.find(
      { role: "Branch Admin" },
      "name email role designation branch"
    ).lean();

    console.log("Current Branch Admins:", branchAdmins);
    await mongoose.disconnect();
    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

runMigration();
