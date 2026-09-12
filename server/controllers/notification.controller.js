import Notification from "../models/Notification.js";

/**
 * @desc Get all notifications for logged-in user
 * @route GET /api/notifications
 */
export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate("order", "orderNumber customerName itemType deliveryDeadline branch")
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false
    });

    return res.status(200).json({
      success: true,
      unreadCount,
      notifications
    });
  } catch (error) {
    console.error("Get Notifications Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error." });
  }
};

/**
 * @desc Mark single notification as read
 * @route PATCH /api/notifications/:id/read
 */
export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }

    return res.status(200).json({ success: true, message: "Marked as read." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error." });
  }
};

/**
 * @desc Mark all notifications as read
 * @route PATCH /api/notifications/mark-all-read
 */
export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );

    return res.status(200).json({ success: true, message: "All notifications marked as read." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error." });
  }
};