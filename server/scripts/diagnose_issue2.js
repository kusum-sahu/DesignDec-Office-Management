import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import Order from "../models/Order.js";
import Counter from "../models/Counter.js";

async function diagnose() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  // 1. Fetch ALL orders (including isDeleted: true)
  const allOrders = await Order.find({})
    .sort({ orderNumber: 1 })
    .select("orderNumber customerName itemType totalPrice branch deliveryStatus isDeleted createdAt orderDate")
    .lean();

  console.log(`Total orders in DB: ${allOrders.length}`);
  console.log("--- ALL ORDERS IN DB ---");
  for (const o of allOrders) {
    console.log(
      `ID: ${o._id} | Order#: ${o.orderNumber} | Branch: ${o.branch} | Status: ${o.deliveryStatus} | isDeleted: ${o.isDeleted} | CreatedAt: ${o.createdAt?.toISOString()} | OrderDate: ${o.orderDate?.toISOString()} | Customer: ${o.customerName}`
    );
  }

  // 2. Fetch counters
  const counters = await Counter.find({}).lean();
  console.log("\n--- COUNTERS IN DB ---");
  for (const c of counters) {
    console.log(`Counter _id: ${c._id} | seq: ${c.seq}`);
  }

  // 3. Check for any soft-deleted orders or missing sequences
  const deletedOrders = await Order.find({ isDeleted: true }).lean();
  console.log(`\nSoft-deleted orders count: ${deletedOrders.length}`);
  for (const d of deletedOrders) {
    console.log(`Deleted Order#: ${d.orderNumber} | Customer: ${d.customerName}`);
  }

  await mongoose.disconnect();
  console.log("\nDisconnected from MongoDB.");
}

diagnose().catch((err) => {
  console.error("Diagnostic error:", err);
  process.exit(1);
});
