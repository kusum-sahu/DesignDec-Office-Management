import express from "express";

import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} from "../controllers/employee.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import authorize from "../middleware/authorize.middleware.js";

const router = express.Router();
// Create Employee
router.post("/", protect, authorize("Admin"), createEmployee);
// Get All Employees Admin kisi bhi employee ko dekh sakta hai.Employee sirf apni profile dekh sakta hai.Ye controller me handle karenge.
router.get("/", protect, authorize("Admin"), getEmployees);
// Get Single Employee
router.get("/:employeeId", protect, authorize("Admin"), getEmployeeById);
// Update Employee
router.put("/:employeeId", protect, authorize("Admin"), updateEmployee);
// Delete Employee
router.delete("/:employeeId", protect, authorize("Admin"), deleteEmployee);

export default router;