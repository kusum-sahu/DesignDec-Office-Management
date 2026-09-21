import dotenv from "dotenv";
dotenv.config({ path: "server/.env" });
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Order from "../models/Order.js";

const BASE_URL = `http://127.0.0.1:${process.env.PORT || 5000}`;

async function runTests() {
  for (let i = 1; i <= 5; i++) {
    try {
      await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
      break;
    } catch (e) {
      console.log(`Connection attempt ${i} failed (${e.message}), retrying in 2s...`);
      if (i === 5) throw e;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  console.log("Connected to MongoDB.");

  // Fetch users
  const admin = await User.findOne({ role: "Admin" });
  const branchAdmin = await User.findOne({ email: "simransahu1218@gmail.com" });
  const employee = await User.findOne({ email: "sahukusum2022@gmail.com" });

  const adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const baToken = jwt.sign({ id: branchAdmin._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const empToken = jwt.sign({ id: employee._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

  // Ensure there is at least one Main Office order
  let moOrder = await Order.findOne({ branch: "Main Office", isDeleted: { $ne: true } });
  if (!moOrder) {
    moOrder = await Order.create({
      orderNumber: `ORD-MO-${Date.now()}`,
      idempotencyKey: `mo-test-${Date.now()}`,
      customerName: "Main Office Exclusive Client",
      contactNo: "9999999999",
      itemType: "Flex Banner",
      totalPrice: 5000,
      advancePaid: 2000,
      deliveryDeadline: new Date(Date.now() + 86400000),
      branch: "Main Office",
      createdBy: admin._id,
    });
  }

  console.log(`\nUsing Main Office order: #${moOrder.orderNumber} (ID: ${moOrder._id})`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // TEST 1: Branch Admin queries all orders -> Main Office orders must NOT appear
  {
    const res = await fetch(`${BASE_URL}/api/v1/orders`, {
      headers: { Authorization: `Bearer ${baToken}` },
    });
    const data = await res.json();
    console.log("TEST 1 Status:", res.status, "Body:", data);
    assert(res.status === 200, "Branch Admin can query orders");
    const hasMOOrder = data.orders?.some((o) => o.branch === "Main Office");
    assert(!hasMOOrder, "Branch Admin CANNOT see any Main Office order in GET /orders");
  }

  // TEST 2: Branch Admin attempts to bypass and pass ?branch=Main Office
  {
    const res = await fetch(`${BASE_URL}/api/v1/orders?branch=Main%20Office`, {
      headers: { Authorization: `Bearer ${baToken}` },
    });
    const data = await res.json();
    const hasMOOrder = data.orders?.some((o) => o.branch === "Main Office");
    assert(!hasMOOrder, "Branch Admin CANNOT bypass branch scoping with ?branch=Main Office");
  }

  // TEST 3: Employee queries orders -> Main Office orders must NOT appear
  {
    const res = await fetch(`${BASE_URL}/api/v1/orders`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const data = await res.json();
    assert(res.status === 200, "Employee can query orders");
    const hasMOOrder = data.orders.some((o) => o.branch === "Main Office");
    assert(!hasMOOrder, "Employee CANNOT see any Main Office order in GET /orders");
  }

  // TEST 4: Branch Admin attempts to update status of Main Office order -> 403 Forbidden
  {
    const res = await fetch(`${BASE_URL}/api/v1/orders/${moOrder._id}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${baToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deliveryStatus: "Delivered" }),
    });
    assert(res.status === 403, "Branch Admin CANNOT update status of Main Office order (403 Forbidden)");
  }

  // TEST 5: Branch Admin attempts to edit Main Office order -> 403 Forbidden
  {
    const res = await fetch(`${BASE_URL}/api/v1/orders/${moOrder._id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${baToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ customerName: "Hacked by Branch" }),
    });
    assert(res.status === 403, "Branch Admin CANNOT edit Main Office order (403 Forbidden)");
  }

  // TEST 6: Branch Admin attempts to delete Main Office order -> 403 Forbidden
  {
    const res = await fetch(`${BASE_URL}/api/v1/orders/${moOrder._id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${baToken}` },
    });
    assert(res.status === 403, "Branch Admin CANNOT delete Main Office order (403 Forbidden)");
  }

  // TEST 7: Branch Admin attempts to add payment to Main Office order -> 403 Forbidden
  {
    const res = await fetch(`${BASE_URL}/api/v1/orders/${moOrder._id}/payment`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${baToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentAmount: 500 }),
    });
    assert(res.status === 403, "Branch Admin CANNOT add payment to Main Office order (403 Forbidden)");
  }

  // TEST 8: SuperAdmin CAN see Main Office order
  {
    const res = await fetch(`${BASE_URL}/api/v1/orders?branch=Main%20Office`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    assert(res.status === 200, "SuperAdmin can query Main Office orders");
    const found = data.orders.some((o) => o._id === String(moOrder._id));
    assert(found, "SuperAdmin CAN see Main Office order when filtering Main Office");
  }

  console.log(`\nTest Summary: ${passed} Passed, ${failed} Failed`);
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
