import User from "../models/User.js";
import generateEmployeeId from "../utils/generateEmployeeId.js";
import generatePassword from "../utils/generatePassword.js";
import validateEmail from "../utils/validateEmail.js"
import sendEmail from "../utils/sendEmail.js";

export const createEmployee = async (req, res) => {
  try {
    const { name, email, phone, department, designation, branch } = req.body;

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

    // Branch Validation (if provided)
    const allowedBranches = ["Main Office", "Santoshpur Branch"];
    let employeeBranch = null;
    if (branch !== undefined && branch !== null && branch !== "") {
      if (!allowedBranches.includes(branch)) {
        return res.status(400).json({
          success: false,
          message: `Invalid branch '${branch}'. Allowed branches: ${allowedBranches.join(", ")}`,
        });
      }
      employeeBranch = branch;
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
    if (role === "Branch Manager" || /^\s*branch\s*man?ager\s*$/i.test(designation || "")) {
      employeeRole = "Branch Manager";
    }

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
      role: { $in: ["Employee", "Branch Manager"] },

      $or: [
        { name: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { designation: { $regex: search, $options: "i" } },
      ],
    };

    if (req.query.branch) {
      filter.branch = req.query.branch;
    }

  //get employees

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
    const employee = await User.findOne({
      employeeId: req.params.employeeId,
      role: { $in: ["Employee", "Branch Manager"] },
    }).select("-password");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
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
    const { name, email, phone, department, designation, status, branch, role } = req.body;

    const employee = await User.findOne({
      employeeId: req.params.employeeId,
      role: { $in: ["Employee", "Branch Manager"] },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
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
        employeeId: { $ne: req.params.employeeId },
      });
      if (existingEmployee) {
        return res.status(400).json({
          success: false,
          message: "Email already exists.",
        });
      }

      employee.email = email;
    }

    if (branch !== undefined) {
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

    if (role && ["Employee", "Branch Manager"].includes(role)) {
      employee.role = role;
    } else if (/^\s*branch\s*man?ager\s*$/i.test(designation || employee.designation || "")) {
      employee.role = "Branch Manager";
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
    const employee = await User.findOne({
      employeeId: req.params.employeeId,
      role: { $in: ["Employee", "Branch Manager"] },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
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
