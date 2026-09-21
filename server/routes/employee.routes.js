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
// Create Employee (Admin & Branch Admin for own branch)
router.post("/", protect, authorize("Admin", "Branch Admin", "Branch Manager"), createEmployee);
// Get All Employees (Admin: all branches; Branch Admin: own branch)
router.get("/", protect, authorize("Admin", "Branch Admin", "Branch Manager"), getEmployees);
// Get Single Employee
router.get("/:employeeId", protect, authorize("Admin", "Branch Admin", "Branch Manager"), getEmployeeById);
// Update Employee
router.put("/:employeeId", protect, authorize("Admin", "Branch Admin", "Branch Manager"), updateEmployee);
// Delete Employee
router.delete("/:employeeId", protect, authorize("Admin", "Branch Admin", "Branch Manager"), deleteEmployee);

export default router;