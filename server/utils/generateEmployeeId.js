import User from "../models/User.js";

// Generate Employee ID
const generateEmployeeId = async () => {

  // Current Year
  const year = new Date().getFullYear();

  // Find Last Employee
  const lastEmployee = await User.findOne({
    employeeId: { $regex: `^DD-${year}-` },
  }).sort({ createdAt: -1 });

  if (!lastEmployee) {
    return `DD-${year}-002`;
  }

  const lastNumber = parseInt(
    lastEmployee.employeeId.split("-")[2]
  );

  const nextNumber = String(lastNumber + 1).padStart(3, "0");

  return `DD-${year}-${nextNumber}`;

};

export default generateEmployeeId;