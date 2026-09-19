import dotenv from "dotenv";
import mongoose from "mongoose";
dotenv.config({ path: "./server/.env" });
import Order from "./server/models/Order.js";

async function testQuery() {
  await mongoose.connect(process.env.MONGO_URI);
  const orders = await Order.find({
    branch: "Santoshpur Branch",
    isDeleted: { $ne: true },
  })
    .sort({ createdAt: -1, _id: -1 })
    .lean();

  console.log("Returned Orders Count:", orders.length);
  orders.forEach((o, idx) => {
    console.log(`${idx + 1}. [${o.orderNumber}] ${o.customerName} - ${o.itemType} (Created: ${o.createdAt.toISOString()})`);
  });

  await mongoose.disconnect();
}

testQuery();
