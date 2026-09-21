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

async function investigate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.\n");

  // 1. List all collections in DB
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log("=== ALL COLLECTIONS IN DATABASE ===");
  collections.forEach((col) => console.log(` - ${col.name}`));

  // 2. Fetch DDS-014 and DDS-015 details
  const order14 = await Order.findOne({ orderNumber: "DDS-014" }).lean();
  const order15 = await Order.findOne({ orderNumber: "DDS-015" }).lean();

  console.log("\n=== REAL ORDERS CURRENTLY HAVING DDS-014 & DDS-015 ===");
  if (order14) {
    console.log("Order DDS-014:");
    console.log(JSON.stringify(order14, null, 2));
  } else {
    console.log("Order DDS-014: NOT FOUND");
  }

  if (order15) {
    console.log("\nOrder DDS-015:");
    console.log(JSON.stringify(order15, null, 2));
  } else {
    console.log("Order DDS-015: NOT FOUND");
  }

  // 3. Confirm whether DDS-010, DDS-011, DDS-012, DDS-013 exist in ANY collection
  console.log("\n=== CHECKING FOR DDS-010, DDS-011, DDS-012, DDS-013 IN ORDERS ===");
  const missingOrders = await Order.find({
    orderNumber: { $in: ["DDS-010", "DDS-011", "DDS-012", "DDS-013"] },
  }).lean();
  console.log(`Found in Order collection: ${missingOrders.length}`);
  missingOrders.forEach((o) => console.log(o));

  // 4. Check for references in Notification collection
  const targetIds = [order14?._id, order15?._id].filter(Boolean);
  const targetNumbers = ["DDS-010", "DDS-011", "DDS-012", "DDS-013", "DDS-014", "DDS-015"];

  console.log("\n=== CHECKING NOTIFICATIONS COLLECTION ===");
  const notifsById = await Notification.find({ order: { $in: targetIds } }).lean();
  console.log(`Notifications referencing order ID: ${notifsById.length}`);
  notifsById.forEach((n) =>
    console.log(` - ID: ${n._id}, Title: ${n.title}, Message: ${n.message}, Order: ${n.order}`)
  );

  const notifsByText = await Notification.find({
    $or: targetNumbers.map((num) => ({
      $or: [{ title: { $regex: num } }, { message: { $regex: num } }],
    })),
  }).lean();
  console.log(`Notifications referencing order numbers in text: ${notifsByText.length}`);
  notifsByText.forEach((n) =>
    console.log(` - ID: ${n._id}, Title: ${n.title}, Message: ${n.message}`)
  );

  // 5. Check for references in NotificationLog collection
  console.log("\n=== CHECKING NOTIFICATION LOGS COLLECTION ===");
  const logsById = await NotificationLog.find({ order: { $in: targetIds } }).lean();
  console.log(`NotificationLogs referencing order ID: ${logsById.length}`);
  logsById.forEach((l) =>
    console.log(
      ` - ID: ${l._id}, Event: ${l.event}, OrderNum: ${l.orderNumber}, Title: ${l.title}`
    )
  );

  const logsByNum = await NotificationLog.find({
    orderNumber: { $in: targetNumbers },
  }).lean();
  console.log(`NotificationLogs referencing order numbers: ${logsByNum.length}`);
  logsByNum.forEach((l) =>
    console.log(
      ` - ID: ${l._id}, Event: ${l.event}, OrderNum: ${l.orderNumber}, Title: ${l.title}`
    )
  );

  // 6. Check Counter
  console.log("\n=== COUNTER STATUS ===");
  const ddsCounter = await Counter.findById("order_DDS").lean();
  const ddbCounter = await Counter.findById("order_DDB").lean();
  console.log("Counter order_DDS:", ddsCounter);
  console.log("Counter order_DDB:", ddbCounter);

  await mongoose.disconnect();
  console.log("\nDisconnected from MongoDB.");
}

investigate().catch(console.error);
