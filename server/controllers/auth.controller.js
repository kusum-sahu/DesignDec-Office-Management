// Jab frontend se login request aayegi tab ye function chalega

import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";

//! Employee Login (Checks Employee ID & Password)
export const login = async (req, res) => {
  try {
    const { employeeId, password } = req.body;

    // Check if Employee ID and Password are entered
    if (!employeeId || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter Employee ID and Password",
      });
    }

    // Find Employee by Employee ID
    const user = await User.findOne({ employeeId }).select("+password");

    // Employee not found
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Compare Password
    const isPasswordMatched = await user.matchPassword(password);

    if (!isPasswordMatched) {
      return res.status(401).json({
        success: false,
        message: "Invalid Password",
      });
    }

    // Generate JWT Token
    const token = generateToken(user._id);

    // Store Token in HTTP Only Cookie
    res.cookie("token", token, {
      httpOnly: true,
    //   secure: false, // true after deployment with HTTPS
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Hide Password
    user.password = undefined;

    // Force employee to change temporary password
if (!user.isPasswordChanged) {

  return res.status(200).json({
    success: true,
    forcePasswordChange: true,
    message: "Please change your password.",
    user,
  });

}

    // Send Response
    res.status(200).json({
      success: true,
      message: "Login Successful",
      user,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

//! Logout Employee
export const logout = (req, res) => {

  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
  });

  res.status(200).json({
    success: true,
    message: "Logout Successful",
  });

};

//! Create First Admin (Only for Initial Setup)

/* export const createAdmin = async (req, res) => {

  try {

    const adminExists = await User.findOne({
      employeeId: "DD001",
    });

    if (adminExists) {
      return res.status(400).json({
        success: false,
        message: "Admin already exists",
      });
    }

    const admin = await User.create({
      employeeId: "DD001",
      name: "DesignDec Admin",
      email: "admin@designdec.in",
      password: "admin123",
      phone: "9999999999",
      department: "Administration",
      designation: "Administrator",
      role: "Admin",
    });

    res.status(201).json({
      success: true,
      message: "Admin Created Successfully",
      admin,
    });

  } catch (error) {

  console.error("========== ERROR ==========");
  console.error(error);
  console.error(error.stack);
  console.error("===========================");

  return res.status(500).json({
    success: false,
    message: error.message,
  });

  }

}; */

//! Get Logged In Employee
export const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
};
