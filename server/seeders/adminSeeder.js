import dotenv from "dotenv";
import connectDB from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB();   // 👈 Wait for DB connection

    const adminExists = await User.findOne({
      $or: [
        { employeeId: "DD-2026-001" },
        { email: "admin@designdec.in" },
      ],
    });

    if (adminExists) {
      console.log("⚠️ Admin already exists.");
      process.exit(0);
    }

    await User.create({
      employeeId: "DD-2026-001",
      name: "DesignDec Admin",
      email: "admin@designdec.in",
      password: "Admin@123",
      phone: "9999999999",
      department: "Administration",
      designation: "Administrator",
      role: "Admin",
      status: "Active",
      isPasswordChanged: true,
    });

    console.log("✅ Admin Created Successfully");
    process.exit(0);

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedAdmin();