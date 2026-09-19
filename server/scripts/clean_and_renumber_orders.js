import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import Order from "../models/Order.js";
import Counter from "../models/Counter.js";
import User from "../models/User.js";

async function cleanAndRenumberOrders() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  // 1. Delete all soft-deleted orders (remnants of test runs)
  const delSoft = await Order.deleteMany({ isDeleted: true });
  console.log(`Deleted ${delSoft.deletedCount} soft-deleted test order(s).`);

  // 2. Delete test orders generated during automated test suites
  const testUsers = await User.find({
    email: { $in: ["bm.santoshpur.test@designdec.in", "hr.manager.test@designdec.in"] }
  }).select("_id");
  const testUserIds = testUsers.map(u => u._id);

  const delTest = await Order.deleteMany({
    $or: [
      { createdBy: { $in: testUserIds } },
      { customerName: { $in: ["Main Office Customer", "BM Test Client", "Employee Booking Main"] } }
    ]
  });
  console.log(`Deleted ${delTest.deletedCount} automated test order(s).`);

  // 3. Find all remaining real orders for Santoshpur Branch sorted by createdAt ascending
  const santoshpurOrders = await Order.find({
    branch: "Santoshpur Branch",
    isDeleted: { $ne: true }
  }).sort({ createdAt: 1 });

  console.log(`Found ${santoshpurOrders.length} active Santoshpur order(s). Renumbering sequentially...`);

  // Assign temporary order numbers first to avoid unique index collisions
  for (let i = 0; i < santoshpurOrders.length; i++) {
    const ord = santoshpurOrders[i];
    ord.orderNumber = `TEMP-${i}-${Date.now()}`;
    await ord.save();
  }

  // Assign final sequential order numbers
  for (let i = 0; i < santoshpurOrders.length; i++) {
    const ord = santoshpurOrders[i];
    const seqNum = i + 1;
    const newNumber = `DDS-${String(seqNum).padStart(3, "0")}`;
    ord.orderNumber = newNumber;
    await ord.save();
    console.log(`  -> ${ord.customerName} (${ord.itemType}): ${newNumber}`);
  }

  // 4. Update Counter in MongoDB
  await Counter.findByIdAndUpdate(
    "order_DDS",
    { seq: santoshpurOrders.length },
    { upsert: true }
  );
  console.log(`Updated Counter for order_DDS to seq: ${santoshpurOrders.length}`);

  // Disconnect
  await mongoose.disconnect();
  console.log("Done. MongoDB disconnected.");
}

cleanAndRenumberOrders().catch(err => {
  console.error("Error cleaning and renumbering orders:", err);
  process.exit(1);
});
