import dotenv from "dotenv";
dotenv.config({ path: "server/.env" });
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Counter from "../models/Counter.js";
import { generateOrderNumber } from "../utils/orderNumberGenerator.js";

async function runCheck() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  const orders = await Order.find({ isDeleted: { $ne: true }, branch: "Santoshpur Branch" })
    .sort({ createdAt: -1, _id: -1 })
    .select("orderNumber customerName itemType totalPrice deliveryDeadline createdAt orderDate");

  console.log("\nActive Santoshpur Branch Orders (Sorted by createdAt DESC):");
  orders.forEach((o, i) => {
    console.log(
      `${i + 1}. [${o.orderNumber}] ${o.customerName} - ${o.itemType} | Created: ${o.createdAt?.toISOString()} | OrderDate: ${o.orderDate?.toISOString()}`
    );
  });

  const counter = await Counter.findById("order_DDS");
  console.log("\nCounter 'order_DDS':", counter);

  // Test what the next generated order number would be WITHOUT committing to DB
  // (generateOrderNumber increments counter, so we can test generating and resetting back if needed)
  const nextNum = await generateOrderNumber("Santoshpur Branch");
  console.log("Next generated order number:", nextNum);

  // Reset counter back to 4 so we don't consume DDS-005
  await Counter.findByIdAndUpdate("order_DDS", { seq: 4 });
  console.log("Reset counter back to seq: 4 for clean state.");

  await mongoose.disconnect();
}

runCheck().catch(console.error);
