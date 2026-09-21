import dotenv from "dotenv";
import mongoose from "mongoose";
dotenv.config({ path: "./.env" });
import Order from "../models/Order.js";

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const orders = await Order.find({ orderNumber: { $in: ["DDS-014", "DDS-015"] } }).lean();
  console.log(JSON.stringify(orders, null, 2));
  await mongoose.disconnect();
}
main().catch(console.error);
