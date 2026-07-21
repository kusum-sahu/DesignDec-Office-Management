import express from "express";
import { checkIn , checkOut, getAttendanceHistory, getAdminAttendanceReport} from "../controllers/attendance.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

router.post("/check-in", protect, upload.single("photo"), checkIn);

router.post("/check-out", protect, upload.single("photo"), checkOut);

router.get("/history", protect, getAttendanceHistory);

router.get(
    "/admin",
    protect,
    getAdminAttendanceReport
);
/* Ya agar admin middleware bana rakha hai to:
router.get(
    "/admin",
    protect,
    authorizeRoles("Admin"),
    getAdminAttendanceReport
); 
 or
  router.get(
    "/reports",
    protect,
    authorizeRoles("Admin"),
    getAdminAttendanceReport
);
*/
export default router;

