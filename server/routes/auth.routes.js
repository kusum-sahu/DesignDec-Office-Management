//! Authentication ke saare routes ko ek jagah manage karta hai.
import express from "express";
import {
    login,
    logout,
    getMe,
    changePassword,
    forgotPassword,
    verifyOTP,
    resetPassword,
} from "../controllers/auth.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();
//! Create First Admin (Only One Time) (POST : /api/v1/auth/create-admin)
// router.post("/create-admin", createAdmin);

//! Employee Login (POST : /api/v1/auth/login)
router.post("/login", login);

//! Employee Logout (GET : /api/v1/auth/logout)
router.get("/logout", logout);

//! Logged In Employee Details (GET : /api/v1/auth/me)
router.get("/me", protect, getMe);
router.put(
    "/change-password",
    protect,
    changePassword
);

router.post(
    "/forgot-password",
    forgotPassword
);

router.post(
    "/verify-otp",
    verifyOTP
);

router.post(
    "/reset-password",
    resetPassword
);

export default router;