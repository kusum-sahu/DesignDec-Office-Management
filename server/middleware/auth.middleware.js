import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Check Cookie
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
     // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Find User
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }
// User Active?
if (user.status === "Inactive") {
  return res.status(403).json({
    success: false,
    message: "Your account is inactive. Please contact the administrator.",
  });
}
    // Attach User to Request
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or Expired Token",
    });
  }
};

