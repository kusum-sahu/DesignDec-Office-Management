import dotenv from "dotenv";
dotenv.config({ path: "server/.env" });
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Order from "../models/Order.js";

const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;

async function testQuery() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  const simran = await User.findOne({ name: /Simran/i });
  console.log("Logged in user:", {
    name: simran?.name,
    email: simran?.email,
    role: simran?.role,
    branch: simran?.branch,
  });

  const token = jwt.sign({ id: simran._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

  const res = await fetch(`${BASE_URL}/api/v1/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  console.log(`\nAPI Response Status: ${res.status}`);
  console.log(`Total Records: ${data.totalRecords}`);
  console.log("Returned Orders order (top to bottom):");
  data.orders.forEach((o, idx) => {
    console.log(
      `  Row ${idx + 1}: [${o.orderNumber}] ${o.customerName} | ${o.itemType} | Total: ₹${o.totalPrice} | Adv: ₹${o.advancePaid} | Bal: ₹${o.pendingBalance} | Status: ${o.deliveryStatus} | CreatedAt: ${o.createdAt}`
    );
  });

  await mongoose.disconnect();
}

testQuery().catch(console.error);
