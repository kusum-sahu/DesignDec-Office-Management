import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import Order from "../models/Order.js";
import Counter from "../models/Counter.js";
import Notification from "../models/Notification.js";
import NotificationLog from "../models/NotificationLog.js";

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  // Check order 14 (or already 10)
  const order14 = await Order.findOne({ $or: [{ orderNumber: "DDS-014" }, { _id: "6aae6142c6cee98452e855f2" }] });
  const order15 = await Order.findOne({ $or: [{ orderNumber: "DDS-015" }, { _id: "6aae6248c6cee98452e85607" }] });

  // 1. Update order 14 -> DDS-010 if not already
  if (order14 && order14.orderNumber !== "DDS-010") {
    console.log(`Migrating order ${order14._id}: ${order14.orderNumber} -> DDS-010...`);
    order14.orderNumber = "DDS-010";
    await order14.save();
    console.log("  Successfully updated orderNumber to DDS-010.");
  } else if (order14) {
    console.log(`Order ${order14._id} already has orderNumber DDS-010.`);
  }

  // Update notifications referencing order14
  if (order14) {
    const notifs14 = await Notification.find({ order: order14._id });
    for (const n of notifs14) {
      if (n.title.includes("DDS-014") || n.message.includes("DDS-014")) {
        n.title = n.title.replace(/DDS-014/g, "DDS-010");
        n.message = n.message.replace(/DDS-014/g, "DDS-010");
        await n.save();
      }
    }
    console.log(`  Updated ${notifs14.length} Notification(s) for DDS-010.`);

    const logs14 = await NotificationLog.find({ $or: [{ order: order14._id }, { orderNumber: "DDS-014" }] });
    for (const l of logs14) {
      l.orderNumber = "DDS-010";
      if (l.title) l.title = l.title.replace(/DDS-014/g, "DDS-010");
      if (l.message) l.message = l.message.replace(/DDS-014/g, "DDS-010");
      await l.save();
    }
    console.log(`  Updated ${logs14.length} NotificationLog(s) for DDS-010.`);
  }

  // 2. Update order 15 -> DDS-011
  if (order15 && order15.orderNumber !== "DDS-011") {
    console.log(`Migrating order ${order15._id}: ${order15.orderNumber} -> DDS-011...`);
    order15.orderNumber = "DDS-011";
    await order15.save();
    console.log("  Successfully updated orderNumber to DDS-011.");
  } else if (order15) {
    console.log(`Order ${order15._id} already has orderNumber DDS-011.`);
  }

  // Update notifications referencing order15
  if (order15) {
    const notifs15 = await Notification.find({ order: order15._id });
    for (const n of notifs15) {
      if (n.title.includes("DDS-015") || n.message.includes("DDS-015")) {
        n.title = n.title.replace(/DDS-015/g, "DDS-011");
        n.message = n.message.replace(/DDS-015/g, "DDS-011");
        await n.save();
      }
    }
    console.log(`  Updated ${notifs15.length} Notification(s) for DDS-011.`);

    const logs15 = await NotificationLog.find({ $or: [{ order: order15._id }, { orderNumber: "DDS-015" }] });
    for (const l of logs15) {
      l.orderNumber = "DDS-011";
      if (l.title) l.title = l.title.replace(/DDS-015/g, "DDS-011");
      if (l.message) l.message = l.message.replace(/DDS-015/g, "DDS-011");
      await l.save();
    }
    console.log(`  Updated ${logs15.length} NotificationLog(s) for DDS-011.`);
  }

  // 3. Update counter order_DDS to 11
  await Counter.findByIdAndUpdate(
    "order_DDS",
    { seq: 11 },
    { upsert: true }
  );
  console.log("Successfully set Counter 'order_DDS' to seq: 11.");

  // 4. Verify resulting state
  const santoshpurOrders = await Order.find({ branch: "Santoshpur Branch", isDeleted: { $ne: true } })
    .sort({ orderNumber: 1 })
    .select("orderNumber customerName totalPrice deliveryStatus createdAt");

  console.log("\n=== VERIFIED SANTOSHPUR ORDERS SEQUENCE ===");
  santoshpurOrders.forEach((o, i) => {
    console.log(` ${i + 1}. #${o.orderNumber} - ${o.customerName} (Status: ${o.deliveryStatus})`);
  });

  const counterDDS = await Counter.findById("order_DDS");
  console.log(`\nCurrent Counter order_DDS seq = ${counterDDS.seq}.`);
  console.log(`Next generated order will be: DDS-${String(counterDDS.seq + 1).padStart(3, "0")} (DDS-012).`);

  await mongoose.disconnect();
  console.log("MongoDB disconnected. Migration complete.");
}

migrate().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
