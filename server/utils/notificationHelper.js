import User from "../models/User.js";
import Notification from "../models/Notification.js";

/**
 * Send notification to all Admins (Main Office)
 */
export const notifyAdmins = async ({ title, message, type, orderId }) => {
  try {
    const admins = await User.find({ role: "Admin", status: "Active" }).select("_id");
    if (!admins.length) return;

    const notifications = admins.map((admin) => ({
      recipient: admin._id,
      title,
      message,
      type,
      order: orderId,
      isRead: false
    }));

    await Notification.insertMany(notifications);
  } catch (error) {
    console.error("Error notifying admins:", error);
  }
};

/**
 * Send notification to Admin + Specific Branch Staff/Managers
 */
export const notifyBothOffices = async ({ title, message, type, orderId, branchName }) => {
  try {
    // Find Admins AND employees/managers belonging to that branch
    const recipients = await User.find({
      status: "Active",
      $or: [
        { role: "Admin" },
        { branch: branchName }
      ]
    }).select("_id");

    if (!recipients.length) return;

    const notifications = recipients.map((user) => ({
      recipient: user._id,
      title,
      message,
      type,
      order: orderId,
      isRead: false
    }));

    await Notification.insertMany(notifications);
  } catch (error) {
    console.error("Error notifying both offices:", error);
  }
};