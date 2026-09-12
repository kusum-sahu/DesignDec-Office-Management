import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { getDashboardStatistics, getTodayAttendance } from "../controllers/dashboard.controller.js";

const router = express.Router();

router.get("/", protect, getDashboardStatistics);
router.get("/today-attendance", protect, getTodayAttendance);

export default router; 