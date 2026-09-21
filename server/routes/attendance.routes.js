import express from "express";
import {
  checkIn,
  checkOut,
  getMyTodayAttendance,
  getAttendanceHistory,
  getAdminAttendanceReport,
  getAttendanceSettings,
  updateBranchLocation,
  getIncompleteAttendance,
  submitCorrectionRequest,
  getMyCorrectionRequests,
  getAllCorrectionRequests,
  approveCorrectionRequest,
  rejectCorrectionRequest,
} from "../controllers/attendance.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import authorize from "../middleware/authorize.middleware.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

router.get("/today", protect, getMyTodayAttendance);

router.post("/check-in", protect, upload.single("photo"), checkIn);

router.post("/check-out", protect, upload.single("photo"), checkOut);

router.get("/history", protect, getAttendanceHistory);

router.get("/settings", protect, getAttendanceSettings);

router.put("/settings/branch-location", protect, authorize("Admin"), updateBranchLocation);

router.get("/admin", protect, authorize("Admin", "Branch Admin", "Branch Manager"), getAdminAttendanceReport);

// Correction Request Flow
router.get("/incomplete", protect, getIncompleteAttendance);
router.post("/correction-request", protect, submitCorrectionRequest);
router.get("/correction-requests/my", protect, getMyCorrectionRequests);
router.get("/correction-requests", protect, authorize("Admin", "Branch Admin", "Branch Manager"), getAllCorrectionRequests);
router.patch("/correction-requests/:id/approve", protect, authorize("Admin", "Branch Admin", "Branch Manager"), approveCorrectionRequest);
router.patch("/correction-requests/:id/reject", protect, authorize("Admin", "Branch Admin", "Branch Manager"), rejectCorrectionRequest);

export default router;

