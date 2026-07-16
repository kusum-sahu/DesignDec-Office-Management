// JWT verify karne ke liye.
/* 
import jwt from "jsonwebtoken";
import User from "../models/User.js";

//! Protect Private Routes (Verify JWT Token)
export const protect = async (req, res, next) => {

  try {
    let token;
    // Check Authorization Header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    // Token Missing
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access Denied. Please Login.",
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Find Logged In User
    req.user = await User.findById(decoded.id).select("-password");

    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or Expired Token",
    });

  }

}; */

import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Cookie se token lo
    if (req.cookies.token) {
      token = req.cookies.token;
    }

    // 2. Agar cookie nahi hai to Authorization Header check karo
    if (
      !token &&
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access Denied. Please Login.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select("-password");

    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or Expired Token",
    });
  }
};