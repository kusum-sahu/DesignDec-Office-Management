// import cron from "node-cron";
// import Order from "../models/Order.js";
// import Notification from "../models/Notification.js";

// // Run every day at 8:00 AM
// export const initDeadlineCron = () => {
//   cron.schedule("0 8 * * *", async () => {
//     try {
//       const today = new Date();
//       const tomorrow = new Date(today);
//       tomorrow.setDate(tomorrow.getDate() + 1);

//       const startOfTomorrow = new Date(tomorrow.setHours(0, 0, 0, 0));
//       const endOfTomorrow = new Date(tomorrow.setHours(23, 59, 59, 999));

//       // Find orders whose deadline is tomorrow and not delivered yet
//       const upcomingOrders = await Order.find({
//         deliveryDeadline: { $gte: startOfTomorrow, $lte: endOfTomorrow },
//         deliveryStatus: { $in: ["Pending", "In Progress", "Ready"] }
//       });

//       for (const order of upcomingOrders) {
//         // Create notification for Main + Branch
//         await Notification.create({
//           title: "⚠️ Deadline Alert: Tomorrow!",
//           message: `Order #${order.orderNumber} (${order.customerName} - ${order.itemType}) is due tomorrow! Pending status: ${order.deliveryStatus}`,
//           type: "DEADLINE_ALERT",
//           order: order._id,
//           targetRole: "All",
//           branch: order.branch
//         });
//       }
//       console.log(`[CRON] Processed ${upcomingOrders.length} deadline alerts for tomorrow.`);
//     } catch (err) {
//       console.error("[CRON ERROR]:", err);
//     }
//   });
// };


import cron from "node-cron";
import Order from "../models/Order.js";
import { notifyBothOffices } from "../utils/notificationHelper.js";

export const initDeadlineCron = () => {
  // Roz subah 8:00 AM chalega ('0 8 * * *')
  // Testing ke liye har 1 minute pe check karne ke liye: '* * * * *' use kar sakte ho
  cron.schedule("0 8 * * *", async () => {
    console.log("⏰ [CRON JOB] Running Deadline Checker for Tomorrow...");

    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const startOfTomorrow = new Date(tomorrow.setHours(0, 0, 0, 0));
      const endOfTomorrow = new Date(tomorrow.setHours(23, 59, 59, 999));

      // Wo orders jo kal due hain aur abhi tak Deliver ya Cancel nahi hue
      const upcomingOrders = await Order.find({
        deliveryDeadline: { $gte: startOfTomorrow, $lte: endOfTomorrow },
        deliveryStatus: { $in: ["Pending", "In Progress", "Ready"] }
      });

      console.log(`[CRON] Found ${upcomingOrders.length} orders due tomorrow.`);

      for (const order of upcomingOrders) {
        await notifyBothOffices({
          title: "⚠️ Delivery Deadline Tomorrow!",
          message: `Order #${order.orderNumber} for "${order.customerName}" (${order.itemType}) is due tomorrow! Pending status: ${order.deliveryStatus}. Pending balance: ₹${order.pendingBalance}.`,
          type: "DEADLINE_ALERT",
          orderId: order._id,
          branchName: order.branch
        });
      }
    } catch (err) {
      console.error("[CRON ERROR]:", err);
    }
  });
};