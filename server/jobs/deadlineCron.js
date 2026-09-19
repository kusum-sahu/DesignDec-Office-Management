import cron from "node-cron";
import Order from "../models/Order.js";
import notificationService from "../services/notifications/NotificationService.js";

/**
 * Checks for orders due tomorrow and dispatches multi-channel alerts with idempotency
 */
export const checkAndNotifyUpcomingDeadlines = async () => {
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startOfTomorrow = new Date(tomorrow.setHours(0, 0, 0, 0));
    const endOfTomorrow = new Date(tomorrow.setHours(23, 59, 59, 999));

    // Find orders due tomorrow that are not yet Delivered or Cancelled
    const upcomingOrders = await Order.find({
      deliveryDeadline: { $gte: startOfTomorrow, $lte: endOfTomorrow },
      deliveryStatus: { $in: ["Pending", "In Progress", "Ready"] },
      isDeleted: { $ne: true },
    });

    console.log(`⏰ [CRON] Found ${upcomingOrders.length} orders due tomorrow.`);

    for (const order of upcomingOrders) {
      // Date-scoped idempotent multi-channel dispatch
      await notificationService.notifyDeadlineAlert(order);
    }

    return upcomingOrders.length;
  } catch (err) {
    console.error("⏰ [CRON ERROR] Deadline checker failed:", err);
    return 0;
  }
};

export const initDeadlineCron = () => {
  // Runs every day at 8:00 AM ('0 8 * * *')
  cron.schedule("0 8 * * *", async () => {
    console.log("⏰ [CRON JOB] Running Daily Deadline Checker for Tomorrow...");
    await checkAndNotifyUpcomingDeadlines();
  });
};