import Notification from "../models/Notification.js";
import NotificationLog from "../models/NotificationLog.js";

/**
 * @desc Get all notifications for logged-in user
 * @route GET /api/v1/notifications
 */
export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate("order", "orderNumber customerName itemType deliveryDeadline branch")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error("Get Notifications Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error." });
  }
};

/**
 * @desc Mark single notification as read
 * @route PATCH /api/v1/notifications/:id/read
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
 * @route PATCH /api/v1/notifications/mark-all-read
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

/**
 * @desc Get multi-channel delivery audit logs (Admin only)
 * @route GET /api/v1/notifications/logs
 */
export const getNotificationDeliveryLogs = async (req, res) => {
  try {
    const {
      event,
      status,
      branch,
      channel,
      orderNumber,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (event) query.event = event;
    if (status) query.overallStatus = status;
    if (branch) query.branch = branch;
    if (orderNumber) query.orderNumber = orderNumber;

    if (channel) {
      query["channels.channel"] = channel;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { recipientName: searchRegex },
        { recipientPhone: searchRegex },
        { orderNumber: searchRegex },
        { title: searchRegex },
        { message: searchRegex },
      ];
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [logs, totalRecords] = await Promise.all([
      NotificationLog.find(query)
        .populate("recipient", "name email role branch")
        .populate("order", "orderNumber customerName itemType deliveryStatus")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      NotificationLog.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      totalRecords,
      currentPage: pageNum,
      totalPages: Math.ceil(totalRecords / limitNum),
      logs,
    });
  } catch (error) {
    console.error("Get Delivery Logs Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error." });
  }
};