// Jab frontend se login request aayegi tab ye function chalega
import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import generateOTP from "../utils/generateOTP.js";
import sendOTPEmail from "../utils/sendOTPEmail.js";

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
//! change password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Check required fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    // Password length
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    // Confirm Password
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match.",
      });
    }

    // Get Logged In User
    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Verify Current Password
    const isMatched = await bcrypt.compare(currentPassword, user.password);

    if (!isMatched) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    // Prevent same password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be same as current password.",
      });
    }

    // Update Password
    user.password = newPassword;

    user.isPasswordChanged = true;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Change Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
};

//! Forgot Password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const user = await User.findOne({ email });
    //for wait 60 seconds before requesting another OTP
    if (
      user &&
      user.passwordResetRequestedAt &&
      Date.now() - user.passwordResetRequestedAt.getTime() < 60 * 1000
    ) {
      return res.status(429).json({
        success: false,
        message: "Please wait 60 seconds before requesting another OTP.",
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    const otp = generateOTP();

    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

    user.passwordResetOTP = hashedOTP;
    user.passwordResetOTPExpire = Date.now() + 10 * 60 * 1000;
    user.passwordResetRequestedAt = new Date();
    // naya OTP generate karte waqt password reset attempts aur block time reset kar do
    user.passwordResetAttempts = 0;
    user.passwordResetBlockedUntil = null;

    await user.save();

    await sendOTPEmail({
      to: user.email,
      employeeName: user.name,
      otp,
    });

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
};
//! Verify OTP
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required.",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    // For security, block user for 15 minutes after 5 incorrect OTP attempts
    if (
      user.passwordResetBlockedUntil &&
      user.passwordResetBlockedUntil > Date.now()
    ) {
      return res.status(429).json({
        success: false,
        message:
          "Too many incorrect OTP attempts. Please try again after 15 minutes.",
      });
    }

    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

    if (user.passwordResetOTP !== hashedOTP) {
      user.passwordResetAttempts += 1;

      if (user.passwordResetAttempts >= 5) {
        user.passwordResetBlockedUntil = Date.now() + 15 * 60 * 1000;

        user.passwordResetAttempts = 0;
      }

      await user.save();

      return res.status(400).json({
        success: false,
        message: "Invalid OTP.",
      });
    }

    if (user.passwordResetOTPExpire < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired.",
      });
    }

    user.passwordResetAttempts = 0;
    user.passwordResetBlockedUntil = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
};
//! Reset Password
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match.",
      });
    }

    /* const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    } */
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If an account with this email exists, an OTP has been sent.",
      });
    }
    if (user.passwordResetOTP !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP.",
      });
    }

    if (user.passwordResetOTPExpire < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired.",
      });
    }

    user.password = newPassword;

    user.isPasswordChanged = true;

    user.passwordResetOTP = null;
    user.passwordResetOTPExpire = null;

    user.passwordResetRequestedAt = null;

    user.passwordResetAttempts = 0;

    user.passwordResetBlockedUntil = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error.",
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

//! Get Logged In Employee
export const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
};
