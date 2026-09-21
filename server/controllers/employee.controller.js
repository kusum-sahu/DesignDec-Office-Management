import mongoose from "mongoose";
import User from "../models/User.js";
import generateEmployeeId from "../utils/generateEmployeeId.js";
import generatePassword from "../utils/generatePassword.js";
import validateEmail from "../utils/validateEmail.js"
import sendEmail from "../utils/sendEmail.js";

export const createEmployee = async (req, res) => {
  try {
    const caller = req.user;
    const isCallerAdmin = caller?.role === "Admin";
    const isCallerBranchAdmin =
      caller?.role === "Branch Admin" ||
      caller?.role === "Branch Manager" ||
      (caller?.role !== "Admin" && /^\s*branch\s*(admin|man?ager)\s*$/i.test(caller?.designation || ""));

    const { name, email, phone, department, designation, branch, role } = req.body;

    // Required Fields Validation
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and Email are required.",
      });
    }

    // Email Validation
    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    // Branch Validation & Scoping
    const allowedBranches = ["Main Office", "Santoshpur Branch"];
    let employeeBranch = null;

    if (!isCallerAdmin && isCallerBranchAdmin) {
      // Branch Admin MUST have a branch assigned and can only create for their branch
      if (!caller.branch || !allowedBranches.includes(caller.branch)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. No valid branch assigned to your Branch Admin account.",
        });
      }
      if (branch && branch !== caller.branch) {
        return res.status(403).json({
          success: false,
          message: "Branch Admins can only create employees for their assigned branch.",
        });
      }
      if (role && role !== "Employee") {
        return res.status(403).json({
          success: false,
          message: "Branch Admins can only create employees with 'Employee' role.",
        });
      }
      employeeBranch = caller.branch;
    } else {
      // Admin can assign any allowed branch
      if (branch !== undefined && branch !== null && branch !== "") {
        if (!allowedBranches.includes(branch)) {
          return res.status(400).json({
            success: false,
            message: `Invalid branch '${branch}'. Allowed branches: ${allowedBranches.join(", ")}`,
          });
        }
        employeeBranch = branch;
      }
    }

    // Check Duplicate Email
    const existingEmployee = await User.findOne({ email });

    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: "Employee already exists with this email.",
      });
    }

    // Generate Employee ID
    const employeeId = await generateEmployeeId();

    // Generate Temporary Password
    const tempPassword = generatePassword();

    // Determine Role
    let employeeRole = "Employee";
    if (isCallerAdmin) {
      if (
        role === "Branch Admin" ||
        role === "Branch Manager" ||
        /^\s*branch\s*(admin|man?ager)\s*$/i.test(designation || "")
      ) {
        employeeRole = "Branch Admin";
      }
    }
    // Note: If caller is Branch Admin, employeeRole is strictly "Employee"

    // Create Employee
    const employee = await User.create({
      employeeId,
      name,
      email,
      password: tempPassword,
      phone,
      department,
      designation,
      branch: employeeBranch,
      role: employeeRole,
      status: "Active",
      isPasswordChanged: false,
    });

    // Send Welcome Email with credentials
    try {
      await sendEmail({
        to: employee.email,
        subject: "Welcome to DesignDec - Your Employee Account Credentials",
        employeeName: employee.name,
        employeeId: employee.employeeId,
        temporaryPassword: tempPassword,
      });
    } catch (emailError) {
      console.error("❌ Onboarding Email Sending Failed:", emailError.message);
      // Rollback employee creation to prevent orphaned accounts with lost passwords
      await User.findByIdAndDelete(employee._id);
      return res.status(500).json({
        success: false,
        message:
          "Failed to deliver welcome email with temporary password. Employee creation was rolled back. Please check SMTP configuration or employee email.",
      });
    }

    // Success Response
    res.status(201).json({
      success: true,
      message:
        "Employee created successfully. A secure temporary password has been sent to the employee's email.",
      employee: {
        _id: employee._id,
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        department: employee.department,
        designation: employee.designation,
        branch: employee.branch,
        role: employee.role,
        status: employee.status,
        joiningDate: employee.joiningDate,
      },
    });
  } catch (error) {
    console.error("Create Employee Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create employee.",
    });
  }
};

export const getEmployees = async (req, res) => {
  try {
    const caller = req.user;
    const isCallerAdmin = caller?.role === "Admin";
    const isCallerBranchAdmin =
      caller?.role === "Branch Admin" ||
      caller?.role === "Branch Manager" ||
      (caller?.role !== "Admin" && /^\s*branch\s*(admin|man?ager)\s*$/i.test(caller?.designation || ""));

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search || "";

    // Allowed Sorting Fields
    const allowedSortFields = [
      "employeeId",
      "name",
      "email",
      "department",
      "designation",
      "joiningDate",
      "createdAt",
    ];

    const sort = allowedSortFields.includes(req.query.sort)
      ? req.query.sort
      : "createdAt";

    const order = req.query.order === "asc" ? 1 : -1;

    const skip = (page - 1) * limit;

    const filter = {
      role: { $in: ["Employee", "Branch Admin", "Branch Manager"] },

      $or: [
        { name: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { designation: { $regex: search, $options: "i" } },
      ],
    };

    if (isCallerAdmin) {
      if (req.query.branch) {
        filter.branch = req.query.branch;
      }
    } else if (isCallerBranchAdmin) {
      if (!caller.branch) {
        return res.status(403).json({
          success: false,
          message: "Access denied. No branch assigned to your Branch Admin account.",
        });
      }
      filter.branch = caller.branch;
    }

    const employees = await User.find(filter)
      .select("-password")
      .sort({ [sort]: order })
      .skip(skip)
      .limit(limit);

    const totalEmployees = await User.countDocuments(filter);

    const totalPages = Math.ceil(totalEmployees / limit);

    res.status(200).json({
      success: true,
      message: "Employees fetched successfully.",

      pagination: {
        currentPage: page,
        totalPages,
        totalEmployees,
        limit,
      },

      employees,
    });

  } catch (error) {

    console.error("Get Employees Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch employees.",
    });

  }
};

export const getEmployeeById = async (req, res) => {
  try {
    const caller = req.user;
    const isCallerAdmin = caller?.role === "Admin";
    const isCallerBranchAdmin =
      caller?.role === "Branch Admin" ||
      caller?.role === "Branch Manager" ||
      (caller?.role !== "Admin" && /^\s*branch\s*(admin|man?ager)\s*$/i.test(caller?.designation || ""));

    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.employeeId);
    const query = {
      ...(isObjectId
        ? { $or: [{ _id: req.params.employeeId }, { employeeId: req.params.employeeId }] }
        : { employeeId: req.params.employeeId }),
      role: { $in: ["Employee", "Branch Admin", "Branch Manager"] },
    };

    const employee = await User.findOne(query).select("-password");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    if (!isCallerAdmin && isCallerBranchAdmin && employee.branch !== caller.branch) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view employees belonging to your branch.",
      });
    }

    res.status(200).json({
      success: true,
      employee,
    });
  } catch (error) {
    console.error("Get Employee Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch employee.",
    });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const caller = req.user;
    const isCallerAdmin = caller?.role === "Admin";
    const isCallerBranchAdmin =
      caller?.role === "Branch Admin" ||
      caller?.role === "Branch Manager" ||
      (caller?.role !== "Admin" && /^\s*branch\s*(admin|man?ager)\s*$/i.test(caller?.designation || ""));

    const { name, email, phone, department, designation, status, branch, role } = req.body;

    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.employeeId);
    const query = {
      ...(isObjectId
        ? { $or: [{ _id: req.params.employeeId }, { employeeId: req.params.employeeId }] }
        : { employeeId: req.params.employeeId }),
      role: { $in: ["Employee", "Branch Admin", "Branch Manager"] },
    };

    const employee = await User.findOne(query);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    // Branch scoping checks
    if (!isCallerAdmin && isCallerBranchAdmin) {
      if (employee.branch !== caller.branch) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only update employees belonging to your branch.",
        });
      }
      if (branch && branch !== caller.branch) {
        return res.status(403).json({
          success: false,
          message: "Branch Admins cannot reassign employees to a different branch.",
        });
      }
      if (role && role !== "Employee") {
        return res.status(403).json({
          success: false,
          message: "Branch Admins cannot change employee roles.",
        });
      }
    }

    if (email && !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    // Check duplicate email
    if (email && email !== employee.email) {
      const existingEmployee = await User.findOne({
        email,
        _id: { $ne: employee._id },
      });
      if (existingEmployee) {
        return res.status(400).json({
          success: false,
          message: "Email already exists.",
        });
      }

      employee.email = email;
    }

    if (isCallerAdmin && branch !== undefined) {
      if (branch !== null && branch !== "") {
        const allowedBranches = ["Main Office", "Santoshpur Branch"];
        if (!allowedBranches.includes(branch)) {
          return res.status(400).json({
            success: false,
            message: `Invalid branch '${branch}'. Allowed branches: ${allowedBranches.join(", ")}`,
          });
        }
        employee.branch = branch;
      } else {
        employee.branch = null;
      }
    }

    if (isCallerAdmin) {
      if (role && ["Employee", "Branch Admin", "Branch Manager"].includes(role)) {
        employee.role = role === "Branch Manager" ? "Branch Admin" : role;
      } else if (/^\s*branch\s*(admin|man?ager)\s*$/i.test(designation || employee.designation || "")) {
        employee.role = "Branch Admin";
      }
    }

    employee.name = name || employee.name;
    employee.phone = phone || employee.phone;
    employee.department = department || employee.department;
    employee.designation = designation || employee.designation;
    employee.status = status || employee.status;

    await employee.save();

    res.status(200).json({
      success: true,
      message: "Employee updated successfully.",
      employee,
    });
  } catch (error) {
    console.error("Update Employee Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update employee.",
    });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const caller = req.user;
    const isCallerAdmin = caller?.role === "Admin";
    const isCallerBranchAdmin =
      caller?.role === "Branch Admin" ||
      caller?.role === "Branch Manager" ||
      (caller?.role !== "Admin" && /^\s*branch\s*(admin|man?ager)\s*$/i.test(caller?.designation || ""));

    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.employeeId);
    const query = {
      ...(isObjectId
        ? { $or: [{ _id: req.params.employeeId }, { employeeId: req.params.employeeId }] }
        : { employeeId: req.params.employeeId }),
      role: { $in: ["Employee", "Branch Admin", "Branch Manager"] },
    };

    const employee = await User.findOne(query);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    if (!isCallerAdmin && isCallerBranchAdmin) {
      if (employee.branch !== caller.branch) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only delete employees belonging to your branch.",
        });
      }
      if (employee.role === "Branch Admin" || employee.role === "Branch Manager") {
        return res.status(403).json({
          success: false,
          message: "Branch Admins cannot delete another Branch Admin account.",
        });
      }
    }

    await employee.deleteOne();

    res.status(200).json({
      success: true,
      message: "Employee deleted successfully.",
    });
  } catch (error) {

    console.error("Delete Employee Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete employee.",
    });
  }
};
