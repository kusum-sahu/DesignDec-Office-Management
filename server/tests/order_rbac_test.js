import dotenv from "dotenv";
dotenv.config();

import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import { syncCounterWithExistingOrders } from "../utils/orderNumberGenerator.js";

const BASE_URL = `http://127.0.0.1:${process.env.PORT || 5000}`;

const generateTestToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

async function runRbacTests() {
  console.log("=================================================");
  console.log("🧪 RUNNING COMPREHENSIVE ORDER MANAGEMENT RBAC TESTS");
  console.log("=================================================");

  await connectDB();
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

  try {
    // 1. Fixture: Admin User
    const adminUser = await User.findOne({ role: "Admin" });
    if (!adminUser) throw new Error("No Admin user found in database!");
    const adminToken = generateTestToken(adminUser._id);

    // 2. Fixture: Branch Manager (Explicit role: 'Branch Manager', Santoshpur Branch)
    let branchManager = await User.findOne({ email: "bm.santoshpur.test@designdec.in" });
    if (!branchManager) {
      branchManager = await User.create({
        employeeId: "BM-TEST-001",
        name: "Santoshpur Branch Manager",
        email: "bm.santoshpur.test@designdec.in",
        password: "Password@123",
        role: "Branch Manager",
        branch: "Santoshpur Branch",
        designation: "Branch Manager",
        status: "Active",
      });
    } else {
      branchManager.role = "Branch Manager";
      branchManager.branch = "Santoshpur Branch";
      branchManager.status = "Active";
      await branchManager.save();
    }
    const bmToken = generateTestToken(branchManager._id);

    // 3. Fixture: Normal Employee with "HR Manager" designation to test explicit role protection
    let normalEmployee = await User.findOne({ email: "hr.manager.test@designdec.in" });
    if (!normalEmployee) {
      normalEmployee = await User.create({
        employeeId: "EMP-TEST-HR-001",
        name: "HR Manager Employee",
        email: "hr.manager.test@designdec.in",
        password: "Password@123",
        role: "Employee",
        branch: "Main Office",
        designation: "HR Manager",
        status: "Active",
      });
    } else {
      normalEmployee.role = "Employee";
      normalEmployee.designation = "HR Manager";
      normalEmployee.branch = "Main Office";
      normalEmployee.status = "Active";
      await normalEmployee.save();
    }
    const empToken = generateTestToken(normalEmployee._id);

    // 4. Fixture Orders: One Main Office order and one Santoshpur Branch order
    let mainOfficeOrder = await Order.findOne({ branch: "Main Office", isDeleted: { $ne: true } });
    if (!mainOfficeOrder) {
      mainOfficeOrder = await Order.create({
        orderNumber: `ORD-MO-${Date.now()}`,
        idempotencyKey: `idem-mo-${Date.now()}`,
        customerName: "Main Office Customer",
        contactNo: "9876543210",
        itemType: "Flex Banner",
        totalPrice: 10000,
        advancePaid: 3000,
        pendingBalance: 7000,
        paymentStatus: "Partial",
        branch: "Main Office",
        deliveryDeadline: new Date(Date.now() + 86400000 * 3),
        createdBy: adminUser._id,
      });
    }

    let santoshpurOrder = await Order.findOne({ branch: "Santoshpur Branch", isDeleted: { $ne: true } });
    if (!santoshpurOrder) {
      santoshpurOrder = await Order.create({
        orderNumber: `ORD-SP-${Date.now()}`,
        idempotencyKey: `idem-sp-${Date.now()}`,
        customerName: "Santoshpur Customer",
        contactNo: "9876543211",
        itemType: "Sticker",
        totalPrice: 8000,
        advancePaid: 2000,
        pendingBalance: 6000,
        paymentStatus: "Partial",
        branch: "Santoshpur Branch",
        deliveryDeadline: new Date(Date.now() + 86400000 * 4),
        createdBy: branchManager._id,
      });
    }

    // =========================================================================
    // TEST GROUP 1: ADMIN FULL ACCESS & FINANCIAL VISIBILITY
    // =========================================================================
    console.log("\n--- TEST GROUP 1: Admin Full Access & Financial Visibility ---");

    // 1.1 Admin GET /api/v1/orders
    const adminGetOrders = await fetch(`${BASE_URL}/api/v1/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminOrdersData = await adminGetOrders.json();
    assert(adminGetOrders.status === 200, "Admin can GET /api/v1/orders (200)");
    assert(Array.isArray(adminOrdersData.orders) && adminOrdersData.orders.length > 0, "Admin receives list of orders");

    // Verify Admin CAN see financial fields
    const adminFirstOrder = adminOrdersData.orders.find((o) => o.totalPrice !== undefined);
    assert(adminFirstOrder !== undefined, "Admin can see orders with financial details");
    assert(typeof adminFirstOrder?.totalPrice === "number", "Admin CAN see 'totalPrice' (amount)");
    assert(typeof adminFirstOrder?.advancePaid === "number", "Admin CAN see 'advancePaid' (advance)");
    assert(typeof adminFirstOrder?.pendingBalance === "number", "Admin CAN see 'pendingBalance' (balance)");
    assert(typeof adminFirstOrder?.paymentStatus === "string", "Admin CAN see 'paymentStatus'");

    // 1.2 Admin POST /api/v1/orders (Can create order and choose branch)
    const adminCreateOrder = await fetch(`${BASE_URL}/api/v1/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `idem-admin-create-${Date.now()}`,
      },
      body: JSON.stringify({
        customerName: "Admin Booking Main",
        contactNo: "9998887776",
        itemType: "Visiting Cards",
        totalPrice: 2000,
        advancePaid: 500,
        branch: "Santoshpur Branch",
        deliveryDeadline: new Date(Date.now() + 86400000 * 2),
      }),
    });
    const adminCreateData = await adminCreateOrder.json();
    assert(adminCreateOrder.status === 201, "Admin CAN create order with chosen branch (201)");
    assert(adminCreateData.order?.branch === "Santoshpur Branch", "Admin chose 'Santoshpur Branch' successfully");
    assert(adminCreateData.order?.totalPrice === 2000, "Admin created order returns correct totalPrice");

    const adminCreatedOrderId = adminCreateData.order?._id;

    // 1.3 Admin PATCH /api/v1/orders/:id/status (CAN update status across branches)
    const adminUpdateStatus = await fetch(`${BASE_URL}/api/v1/orders/${santoshpurOrder._id}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deliveryStatus: "In Progress" }),
    });
    const adminStatusData = await adminUpdateStatus.json();
    assert(adminUpdateStatus.status === 200, "Admin CAN update order status across branches (200)");
    assert(adminStatusData.order?.deliveryStatus === "In Progress", "Order status updated to 'In Progress'");

    // 1.4 Admin PUT /api/v1/orders/:id (CAN edit order and reassign branch)
    const adminEditOrder = await fetch(`${BASE_URL}/api/v1/orders/${adminCreatedOrderId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerName: "Admin Edited Customer Name",
        branch: "Main Office",
      }),
    });
    const adminEditData = await adminEditOrder.json();
    assert(adminEditOrder.status === 200, "Admin CAN edit order across branches (200)");
    assert(adminEditData.order?.customerName === "Admin Edited Customer Name", "Customer name updated by Admin");
    assert(adminEditData.order?.branch === "Main Office", "Admin can reassign order branch to 'Main Office'");

    // 1.5 Admin PATCH /api/v1/orders/:id/payment (CAN record payment)
    const adminPayment = await fetch(`${BASE_URL}/api/v1/orders/${adminCreatedOrderId}/payment`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentAmount: 500 }),
    });
    const adminPaymentData = await adminPayment.json();
    assert(adminPayment.status === 200, "Admin CAN record payment on order (200)");
    assert(adminPaymentData.order?.advancePaid === 1000, "Advance paid updated correctly by Admin payment");

    // 1.6 Admin DELETE /api/v1/orders/:id (CAN delete order)
    const adminDeleteOrder = await fetch(`${BASE_URL}/api/v1/orders/${adminCreatedOrderId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminDeleteOrder.status === 200, "Admin CAN delete/cancel order (200)");

    // =========================================================================
    // TEST GROUP 2: BRANCH MANAGER PERMISSIONS & ISOLATION
    // =========================================================================
    console.log("\n--- TEST GROUP 2: Branch Manager Permissions & Isolation ---");

    // 2.1 Branch Manager POST /api/v1/orders (CAN create for assigned branch)
    const bmCreateOrder = await fetch(`${BASE_URL}/api/v1/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bmToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `idem-bm-create-${Date.now()}`,
      },
      body: JSON.stringify({
        customerName: "BM Test Client",
        contactNo: "9123456780",
        itemType: "Lighting Board",
        totalPrice: 15000,
        advancePaid: 5000,
        deliveryDeadline: new Date(Date.now() + 86400000 * 5),
      }),
    });
    const bmCreateData = await bmCreateOrder.json();
    assert(bmCreateOrder.status === 201, "Branch Manager CAN create order for assigned branch (201)");
    assert(bmCreateData.order?.branch === "Santoshpur Branch", "Order branch enforced to Branch Manager's branch");
    assert(typeof bmCreateData.order?.totalPrice === "number", "Branch Manager CAN see 'totalPrice' on created order");
    assert(typeof bmCreateData.order?.pendingBalance === "number", "Branch Manager CAN see 'pendingBalance'");

    const createdOrderId = bmCreateData.order?._id;

    // 2.2 Branch Manager POST for another branch (Forbidden)
    const bmCrossBranchCreate = await fetch(`${BASE_URL}/api/v1/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bmToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `idem-bm-cross-${Date.now()}`,
      },
      body: JSON.stringify({
        customerName: "Cross Branch Booking",
        contactNo: "9123456789",
        itemType: "Lighting Board",
        totalPrice: 15000,
        deliveryDeadline: new Date(Date.now() + 86400000 * 5),
        branch: "Main Office",
      }),
    });
    assert(bmCrossBranchCreate.status === 403, "Branch Manager CANNOT create order for another branch (403 Forbidden)");

    // 2.3 Branch Manager GET /api/v1/orders (Locked to assigned branch, sees financials)
    const bmGetOrders = await fetch(`${BASE_URL}/api/v1/orders`, {
      headers: { Authorization: `Bearer ${bmToken}` },
    });
    const bmOrdersData = await bmGetOrders.json();
    assert(bmGetOrders.status === 200, "Branch Manager can GET orders (200)");
    assert(
      bmOrdersData.orders.every((o) => o.branch === "Santoshpur Branch"),
      "Branch Manager strictly locked to Santoshpur Branch orders"
    );
    assert(
      bmOrdersData.orders.some((o) => typeof o.totalPrice === "number" && o.totalPrice > 0),
      "Branch Manager CAN see financial details for their branch orders"
    );

    // 2.4 Branch Manager PUT /api/v1/orders/:id (Assigned branch: Success; Other branch: 403)
    const bmEditOwnOrder = await fetch(`${BASE_URL}/api/v1/orders/${createdOrderId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${bmToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ customerName: "BM Updated Client" }),
    });
    const bmEditOwnData = await bmEditOwnOrder.json();
    assert(bmEditOwnOrder.status === 200, "Branch Manager CAN edit own branch order (200)");
    assert(bmEditOwnData.order?.customerName === "BM Updated Client", "Customer name updated successfully");

    const bmEditOtherBranch = await fetch(`${BASE_URL}/api/v1/orders/${mainOfficeOrder._id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${bmToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ customerName: "Malicious Edit" }),
    });
    assert(bmEditOtherBranch.status === 403, "Branch Manager CANNOT edit other branch order (403 Forbidden)");

    // BM attempting to reassign branch
    const bmReassignBranch = await fetch(`${BASE_URL}/api/v1/orders/${createdOrderId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${bmToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ branch: "Main Office" }),
    });
    assert(bmReassignBranch.status === 403, "Branch Manager CANNOT reassign order to another branch (403 Forbidden)");

    // 2.5 Branch Manager PATCH /api/v1/orders/:id/status (Assigned: 200; Other: 403)
    const bmStatusOwn = await fetch(`${BASE_URL}/api/v1/orders/${createdOrderId}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${bmToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deliveryStatus: "Ready" }),
    });
    assert(bmStatusOwn.status === 200, "Branch Manager CAN update status for own branch order (200)");

    const bmStatusOther = await fetch(`${BASE_URL}/api/v1/orders/${mainOfficeOrder._id}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${bmToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deliveryStatus: "Ready" }),
    });
    assert(bmStatusOther.status === 403, "Branch Manager CANNOT update status for other branch order (403 Forbidden)");

    // 2.6 Branch Manager PATCH /api/v1/orders/:id/payment (Assigned: 200; Other: 403)
    const bmPaymentOwn = await fetch(`${BASE_URL}/api/v1/orders/${createdOrderId}/payment`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${bmToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentAmount: 1000 }),
    });
    const bmPaymentData = await bmPaymentOwn.json();
    assert(bmPaymentOwn.status === 200, "Branch Manager CAN record payment for own branch order (200)");
    assert(typeof bmPaymentData.order?.pendingBalance === "number", "Recorded payment returns updated pending balance");

    const bmPaymentOther = await fetch(`${BASE_URL}/api/v1/orders/${mainOfficeOrder._id}/payment`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${bmToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentAmount: 500 }),
    });
    assert(bmPaymentOther.status === 403, "Branch Manager CANNOT record payment for other branch order (403 Forbidden)");

    // 2.7 Branch Manager DELETE /api/v1/orders/:id (Assigned: 200; Other: 403)
    const bmDeleteOther = await fetch(`${BASE_URL}/api/v1/orders/${mainOfficeOrder._id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${bmToken}` },
    });
    assert(bmDeleteOther.status === 403, "Branch Manager CANNOT delete other branch order (403 Forbidden)");

    const bmDeleteOwn = await fetch(`${BASE_URL}/api/v1/orders/${createdOrderId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${bmToken}` },
    });
    assert(bmDeleteOwn.status === 200, "Branch Manager CAN soft delete own branch order (200)");

    // =========================================================================
    // TEST GROUP 3: NORMAL EMPLOYEE (VIEW & CREATE FOR ASSIGNED BRANCH, FINANCIALS VISIBLE)
    // =========================================================================
    console.log("\n--- TEST GROUP 3: Normal Employee (View & Create, Financials Visible, No Edit/Delete) ---");

    // 3.1 Normal Employee GET /api/v1/orders (View assigned branch orders, sees financials)
    const empGetOrders = await fetch(`${BASE_URL}/api/v1/orders`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const empOrdersData = await empGetOrders.json();
    assert(empGetOrders.status === 200, "Normal Employee can GET orders (200)");
    assert(Array.isArray(empOrdersData.orders), "Normal Employee receives orders array");

    if (empOrdersData.orders.length > 0) {
      const empFirstOrder = empOrdersData.orders.find((o) => typeof o.totalPrice === "number");
      assert(empFirstOrder !== undefined, "Normal Employee CAN see financial fields on orders");
      assert(typeof empFirstOrder?.totalPrice === "number", "Normal Employee CAN see 'totalPrice' (amount)");
      assert(typeof empFirstOrder?.advancePaid === "number", "Normal Employee CAN see 'advancePaid' (advance)");
      assert(typeof empFirstOrder?.pendingBalance === "number", "Normal Employee CAN see 'pendingBalance' (balance)");
      assert(typeof empFirstOrder?.paymentStatus === "string", "Normal Employee CAN see 'paymentStatus'");
    }

    // 3.2 Normal Employee POST /api/v1/orders (CAN create order for assigned branch)
    const empCreate = await fetch(`${BASE_URL}/api/v1/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${empToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `idem-emp-create-${Date.now()}`,
      },
      body: JSON.stringify({
        customerName: "Employee Booking Main",
        contactNo: "9000000001",
        itemType: "Sticker",
        totalPrice: 1000,
        advancePaid: 200,
        deliveryDeadline: new Date(Date.now() + 86400000),
      }),
    });
    const empCreateData = await empCreate.json();
    assert(empCreate.status === 201, "Normal Employee CAN create order for assigned branch (201)");
    assert(empCreateData.order?.branch === "Main Office", "Order branch is enforced to Employee's assigned branch ('Main Office')");
    assert(empCreateData.order?.totalPrice === 1000, "Created order has correct totalPrice");

    const empCreatedOrderId = empCreateData.order?._id;

    // 3.3 Normal Employee POST for another branch (Forbidden)
    const empCrossBranchCreate = await fetch(`${BASE_URL}/api/v1/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${empToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `idem-emp-cross-${Date.now()}`,
      },
      body: JSON.stringify({
        customerName: "Employee Cross Branch Booking",
        contactNo: "9000000002",
        itemType: "Sticker",
        totalPrice: 1000,
        branch: "Santoshpur Branch",
        deliveryDeadline: new Date(Date.now() + 86400000),
      }),
    });
    assert(empCrossBranchCreate.status === 403, "Normal Employee CANNOT create order for another branch (403 Forbidden)");

    // 3.4 Normal Employee PATCH status (Forbidden)
    const empStatus = await fetch(`${BASE_URL}/api/v1/orders/${empCreatedOrderId}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${empToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deliveryStatus: "Delivered" }),
    });
    assert(empStatus.status === 403, "Normal Employee CANNOT update order status (403 Forbidden)");

    // 3.5 Normal Employee PUT edit (Forbidden)
    const empEdit = await fetch(`${BASE_URL}/api/v1/orders/${empCreatedOrderId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${empToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ customerName: "Employee Malicious Edit" }),
    });
    assert(empEdit.status === 403, "Normal Employee CANNOT edit orders (403 Forbidden)");

    // 3.6 Normal Employee DELETE (Forbidden)
    const empDelete = await fetch(`${BASE_URL}/api/v1/orders/${empCreatedOrderId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${empToken}` },
    });
    assert(empDelete.status === 403, "Normal Employee CANNOT delete orders (403 Forbidden)");

    // 3.7 Normal Employee PATCH payment (Forbidden)
    const empPayment = await fetch(`${BASE_URL}/api/v1/orders/${empCreatedOrderId}/payment`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${empToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentAmount: 100 }),
    });
    assert(empPayment.status === 403, "Normal Employee CANNOT record payments (403 Forbidden)");

    console.log("\n=================================================");
    console.log(`🏁 RBAC TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("=================================================");

    // Clean up created test orders so counters and sequences are not corrupted
    const testIdsToClean = [adminCreatedOrderId, createdOrderId, empCreatedOrderId].filter(Boolean);
    if (testIdsToClean.length > 0) {
      await Order.deleteMany({ _id: { $in: testIdsToClean } });
      await syncCounterWithExistingOrders("DDS", true);
      await syncCounterWithExistingOrders("DDB", true);
      console.log(`Cleaned up ${testIdsToClean.length} test order(s) and resynchronized counters.`);
    }

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error("Test execution failed with error:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runRbacTests();
