import User from "../models/User.js";
import generateEmployeeId from "../utils/generateEmployeeId.js";
import generatePassword from "../utils/generatePassword.js";
import validateEmail from "../utils/validateEmail.js"
import sendEmail from "../utils/sendEmail.js";

export const createEmployee = async (req, res) => {
  try {
    const { name, email, phone, department, designation } = req.body;

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

    // Create Employee
    const employee = await User.create({
      employeeId,
      name,
      email,
      password: tempPassword,
      phone,
      department,
      designation,
      role: "Employee",
      status: "Active",
      isPasswordChanged: false,
    });

    // Send Welcome Email
    await sendEmail({
      to: employee.email,
      subject: "Welcome to DesignDec - Your Employee Account",
      employeeName: employee.name,
      employeeId: employee.employeeId,
      temporaryPassword: tempPassword,
    });

    // Success Response
    res.status(201).json({
      success: true,
      message:
        "Employee created successfully. Temporary password has been sent to the employee's email.",
      employee: {
        _id: employee._id,
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        department: employee.department,
        designation: employee.designation,
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
      role: "Employee",

      $or: [
        { name: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { designation: { $regex: search, $options: "i" } },
      ],
    };

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
    //   _id: req.params.id,
     employeeId: req.params.employeeId,
      role: "Employee",
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
    const { name, email, phone, department, designation, status } = req.body;

    const employee = await User.findOne({
      employeeId: req.params.employeeId,
      role: "Employee",
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
      role: "Employee",
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
