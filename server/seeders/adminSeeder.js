import dotenv from "dotenv";
import connectDB from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB(); // 👈 Wait for DB connection

    const employeeId = process.env.ADMIN_EMPLOYEE_ID || "DD-2026-001";
    const email = process.env.ADMIN_EMAIL || "kusumsahu1853@gmail.com";
    const name = process.env.ADMIN_NAME || "Kusum Sahu";
    const phone = process.env.ADMIN_PHONE || "7847867110";
    const password = process.env.ADMIN_PASSWORD || "Kusum@123";

    const adminExists = await User.findOne({
      $or: [
        { employeeId },
        { email },
        { role: "Admin" },
      ],
    });

    if (adminExists) {
      console.log(`⚠️ Admin already exists: ${adminExists.email} (${adminExists.employeeId})`);
      process.exit(0);
    }

    await User.create({
      employeeId,
      name,
      email,
      password,
      phone,
      department: "Administration",
      designation: "Administrator",
      role: "Admin",
      status: "Active",
      isPasswordChanged: true,
    });

    console.log(`✅ Admin Created Successfully: ${email} (${employeeId})`);
    process.exit(0);

  } catch (error) {
    console.error("❌ Admin Seeder Error:", error);
    process.exit(1);
  }
};

seedAdmin();