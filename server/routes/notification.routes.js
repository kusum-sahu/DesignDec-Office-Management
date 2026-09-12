import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from "../controllers/notification.controller.js";

const router = express.Router();

router.use(protect);

router.get("/", getMyNotifications);
router.patch("/:id/read", markNotificationRead);
router.patch("/mark-all-read", markAllNotificationsRead);

export default router;