import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createOrder,
  getAllOrders,
  updateOrderStatus,
  addPayment
} from "../controllers/order.controller.js";

const router = express.Router();

router.use(protect); // Sabhi routes protected rahenge

router.post("/", createOrder);
router.get("/", getAllOrders);
router.patch("/:id/status", updateOrderStatus);
router.patch("/:id/payment", addPayment);

export default router;