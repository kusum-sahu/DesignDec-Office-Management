import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Order from "../models/Order.js";

const BASE_URL = `http://127.0.0.1:${process.env.PORT || 5000}/api/v1`;

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

async function runCustomItemTypeTests() {
  console.log("=================================================");
  console.log("🧪 TESTING CUSTOM ITEM TYPE CREATION & VIEW/EDIT");
  console.log("=================================================");

  await mongoose.connect(process.env.MONGO_URI, { family: 4 });
  console.log("Connected to MongoDB for test fixtures.");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ""}`);
      failed++;
    }
  }

  const createdOrderIds = [];

  try {
    const adminUser = await User.findOne({ role: "Admin" });
    if (!adminUser) throw new Error("No Admin user found in database!");

    const token = generateToken(adminUser._id);
    const getHeaders = () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "Idempotency-Key": `idem-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    });

    // TEST 1: Create Order with Predefined Item Type ("Flex Banner")
    console.log("\n--- TEST 1: Predefined Item Type ('Flex Banner') ---");
    const predefPayload = {
      customerName: "Predefined Test Customer",
      contactNo: "9876543210",
      itemType: "Flex Banner",
      quantity: 2,
      totalPrice: 4500,
      advancePaid: 1500,
      deliveryDeadline: "2026-10-15",
      branch: "Main Office",
    };

    const res1 = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(predefPayload),
    });
    const data1 = await res1.json();
    assert(res1.status === 201, "Predefined item type order created (201)");
    assert(data1.order?.itemType === "Flex Banner", "Order itemType is 'Flex Banner'");
    if (data1.order?._id) createdOrderIds.push(data1.order._id);

    // TEST 2: Create Order with Custom Item Type ("Silicone LED Signage")
    console.log("\n--- TEST 2: Custom Item Type ('Silicone LED Signage') ---");
    const customPayload = {
      customerName: "Custom LED Client",
      contactNo: "9123456780",
      itemType: "Silicone LED Signage",
      quantity: 1,
      totalPrice: 18500,
      advancePaid: 8000,
      deliveryDeadline: "2026-10-20",
      branch: "Santoshpur Branch",
    };

    const res2 = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(customPayload),
    });
    const data2 = await res2.json();
    assert(res2.status === 201, "Custom item type order created (201)");
    assert(data2.order?.itemType === "Silicone LED Signage", "Order itemType saved as 'Silicone LED Signage'");
    if (data2.order?._id) createdOrderIds.push(data2.order._id);

    // TEST 3: Fetch Order and verify custom itemType is returned
    console.log("\n--- TEST 3: Retrieve Order and Verify itemType ---");
    const res3 = await fetch(`${BASE_URL}/orders/${data2.order._id}`, {
      method: "GET",
      headers: getHeaders(),
    });
    const data3 = await res3.json();
    assert(res3.status === 200, "Fetched custom order details (200)");
    assert(data3.order?.itemType === "Silicone LED Signage", "Retrieved order displays exact custom itemType");

    // TEST 4: Update Order to another Custom Item Type ("Customized Mug Printing - Premium Matte")
    console.log("\n--- TEST 4: Update Order to new Custom Item Type ---");
    const updatePayload = {
      itemType: "Customized Mug Printing - Premium Matte",
      totalPrice: 22000,
    };

    const res4 = await fetch(`${BASE_URL}/orders/${data2.order._id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(updatePayload),
    });
    const data4 = await res4.json();
    assert(res4.status === 200, "Updated custom order (200)");
    assert(
      data4.order?.itemType === "Customized Mug Printing - Premium Matte",
      "Updated order saved new custom itemType"
    );

    // TEST 5: Update Order from Custom back to Predefined Item Type ("Visiting Cards")
    console.log("\n--- TEST 5: Switch Order from Custom to Predefined ---");
    const res5 = await fetch(`${BASE_URL}/orders/${data2.order._id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ itemType: "Visiting Cards" }),
    });
    const data5 = await res5.json();
    assert(res5.status === 200, "Switched order to predefined item type (200)");
    assert(data5.order?.itemType === "Visiting Cards", "Order itemType is now 'Visiting Cards'");

    // TEST 6: Reject Empty or Whitespace-only Item Type
    console.log("\n--- TEST 6: Validation - Reject Empty Item Type ---");
    const res6 = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        ...customPayload,
        itemType: "   ",
      }),
    });
    assert(res6.status === 400, "Empty/whitespace item type rejected with 400");

    console.log("\n=================================================");
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("=================================================");
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    if (createdOrderIds.length > 0) {
      await Order.deleteMany({ _id: { $in: createdOrderIds } });
      console.log(`Cleaned up ${createdOrderIds.length} test order(s) from database.`);
    }
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runCustomItemTypeTests();
