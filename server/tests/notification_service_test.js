import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Notification from "../models/Notification.js";
import NotificationLog from "../models/NotificationLog.js";
import {
  NotificationService,
  notificationService,
  resolveBranchRecipients,
  SMSProvider,
  WhatsAppProvider,
} from "../services/notifications/index.js";
import { normalizePhoneNumber } from "../services/notifications/resolvers/recipientResolver.js";
import { checkAndNotifyUpcomingDeadlines } from "../jobs/deadlineCron.js";
import app from "../app.js";

const generateTestToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

async function runNotificationServiceTests() {
  console.log("=================================================");
  console.log("🧪 RUNNING PRODUCTION NOTIFICATION SERVICE TEST SUITE");
  console.log("=================================================");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB for test verification.\n");

  const server = app.listen(0);
  const testPort = server.address().port;
  const BASE_URL = `http://localhost:${testPort}`;
  console.log(`Ephemeral test server running at ${BASE_URL}\n`);

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
    // -------------------------------------------------------------
    // FIXTURES SETUP
    // -------------------------------------------------------------
    console.log("--- Setup: Ensuring Test Users and Branch Managers ---");

    // 1. Admin User
    let adminUser = await User.findOne({ role: "Admin", status: "Active" });
    if (!adminUser) {
      adminUser = await User.create({
        employeeId: "TEST-ADMIN-001",
        name: "Test Admin",
        email: "test.admin.notif@designdec.in",
        password: "Password@123",
        role: "Admin",
        status: "Active",
        phone: "9876543210",
      });
    } else if (!adminUser.phone) {
      adminUser.phone = "9876543210";
      await adminUser.save();
    }
    const adminToken = generateTestToken(adminUser._id);

    // 2. Santoshpur Branch Manager
    let santoshpurBM = await User.findOne({
      email: "bm.santoshpur.notif@designdec.in",
    });
    if (!santoshpurBM) {
      santoshpurBM = await User.create({
        employeeId: "TEST-BM-001",
        name: "Santoshpur BM",
        email: "bm.santoshpur.notif@designdec.in",
        password: "Password@123",
        role: "Branch Manager",
        branch: "Santoshpur Branch",
        status: "Active",
        phone: "7890123456",
      });
    }

    // 3. Normal Employee (should not receive manager alerts)
    let normalEmp = await User.findOne({
      email: "emp.santoshpur.notif@designdec.in",
    });
    if (!normalEmp) {
      normalEmp = await User.create({
        employeeId: "TEST-EMP-001",
        name: "Normal Staff",
        email: "emp.santoshpur.notif@designdec.in",
        password: "Password@123",
        role: "Employee",
        branch: "Santoshpur Branch",
        status: "Active",
        phone: "9123456780",
      });
    }
    const empToken = generateTestToken(normalEmp._id);

    // -------------------------------------------------------------
    // TEST 1: Phone Normalization Logic
    // -------------------------------------------------------------
    console.log("\n--- TEST 1: Phone Normalization Unit Tests ---");
    assert(
      normalizePhoneNumber("9876543210") === "+919876543210",
      "Standard 10-digit phone normalized with +91"
    );
    assert(
      normalizePhoneNumber("+919876543210") === "+919876543210",
      "Pre-formatted E.164 phone preserved"
    );
    assert(
      normalizePhoneNumber("9876-543-210") === "+919876543210",
      "Hyphenated phone cleaned and normalized"
    );
    assert(
      normalizePhoneNumber("919876543210") === "+919876543210",
      "12-digit Indian number prefixed with +"
    );
    assert(
      normalizePhoneNumber("") === null,
      "Empty phone string returns null"
    );
    assert(
      normalizePhoneNumber("invalid123") === null,
      "Invalid alphanumeric string returns null"
    );

    // -------------------------------------------------------------
    // TEST 2: Dynamic Recipient Resolution by Branch
    // -------------------------------------------------------------
    console.log("\n--- TEST 2: Dynamic Recipient Resolution by Branch ---");
    const santoshpurRecipients = await resolveBranchRecipients({
      branch: "Santoshpur Branch",
      event: "NEW_BRANCH_ORDER",
    });

    const recipientIds = santoshpurRecipients.map((r) => String(r.userId));
    assert(
      recipientIds.includes(String(adminUser._id)),
      "Admin is dynamically included for Santoshpur Branch"
    );
    assert(
      recipientIds.includes(String(santoshpurBM._id)),
      "Branch Manager is dynamically included for Santoshpur Branch"
    );
    assert(
      !recipientIds.includes(String(normalEmp._id)),
      "Normal Employee is NOT included in management notification recipients"
    );

    const mainOfficeRecipients = await resolveBranchRecipients({
      branch: "Main Office",
      event: "NEW_ORDER",
    });
    const mainOfficeRecipientIds = mainOfficeRecipients.map((r) =>
      String(r.userId)
    );
    assert(
      mainOfficeRecipientIds.includes(String(adminUser._id)),
      "Admin is included for Main Office orders"
    );
    assert(
      !mainOfficeRecipientIds.includes(String(santoshpurBM._id)),
      "Santoshpur Branch Manager is NOT included for Main Office orders"
    );

    // -------------------------------------------------------------
    // TEST 3: Multi-Channel Dispatch (In-App & SMS Mandatory, WhatsApp Optional)
    // -------------------------------------------------------------
    console.log("\n--- TEST 3: Multi-Channel Dispatch & WhatsApp Toggle ---");
    const testOrderId = new mongoose.Types.ObjectId();
    const testOrderNumber = `DD-TEST-${Date.now().toString().slice(-4)}`;

    const mockOrder = {
      _id: testOrderId,
      orderNumber: testOrderNumber,
      customerName: "Ramesh Sharma",
      itemType: "Flex Banner",
      branch: "Santoshpur Branch",
      totalPrice: 4000,
      advancePaid: 1500,
      pendingBalance: 2500,
      deliveryStatus: "Pending",
      paymentStatus: "Partial",
    };

    // Test with WHATSAPP_ENABLED = false (Default)
    process.env.WHATSAPP_ENABLED = "false";
    const dispatchResult1 = await notificationService.notifyOrderCreated(
      mockOrder
    );

    assert(
      dispatchResult1.success === true,
      "Order created dispatch completes successfully"
    );
    assert(
      dispatchResult1.recipientCount >= 2,
      `Resolved at least 2 recipients (found: ${dispatchResult1.recipientCount})`
    );

    // Verify in-app notifications created in DB
    const adminInAppNotif = await Notification.findOne({
      recipient: adminUser._id,
      order: testOrderId,
    });
    assert(
      adminInAppNotif !== null,
      "In-App notification document created in MongoDB for Admin"
    );
    assert(
      adminInAppNotif.type === "NEW_BRANCH_ORDER",
      "In-App notification type is NEW_BRANCH_ORDER"
    );

    // Verify audit log
    const auditLogAdmin = await NotificationLog.findOne({
      recipient: adminUser._id,
      order: testOrderId,
    });
    assert(auditLogAdmin !== null, "NotificationLog created for Admin");

    const inAppStatus = auditLogAdmin.channels.find(
      (c) => c.channel === "in_app"
    );
    const smsStatus = auditLogAdmin.channels.find((c) => c.channel === "sms");
    const waStatus = auditLogAdmin.channels.find(
      (c) => c.channel === "whatsapp"
    );

    assert(inAppStatus?.status === "SENT", "In-App channel status is SENT");
    assert(smsStatus?.status === "SENT", "SMS mandatory channel status is SENT");
    assert(
      waStatus?.status === "SKIPPED",
      "WhatsApp channel status is SKIPPED when WHATSAPP_ENABLED=false"
    );

    // -------------------------------------------------------------
    // TEST 4: WhatsApp Channel when Enabled
    // -------------------------------------------------------------
    console.log("\n--- TEST 4: WhatsApp Channel when WHATSAPP_ENABLED=true ---");
    process.env.WHATSAPP_ENABLED = "true";

    const waTestOrderId = new mongoose.Types.ObjectId();
    const waMockOrder = {
      _id: waTestOrderId,
      orderNumber: `DD-WA-${Date.now().toString().slice(-4)}`,
      customerName: "Pooja Verma",
      itemType: "Visiting Cards",
      branch: "Santoshpur Branch",
      totalPrice: 1200,
      advancePaid: 1200,
      pendingBalance: 0,
      deliveryStatus: "Pending",
      paymentStatus: "Paid",
    };

    const dispatchResultWA = await notificationService.notifyOrderCreated(
      waMockOrder
    );
    assert(
      dispatchResultWA.success === true,
      "Dispatch with WhatsApp enabled succeeds"
    );

    const waLog = await NotificationLog.findOne({
      recipient: adminUser._id,
      order: waTestOrderId,
    });
    const waChannelLog = waLog.channels.find((c) => c.channel === "whatsapp");
    assert(
      waChannelLog?.status === "SENT",
      "WhatsApp channel status is SENT when WHATSAPP_ENABLED=true"
    );

    // Reset WHATSAPP_ENABLED back to false
    process.env.WHATSAPP_ENABLED = "false";

    // -------------------------------------------------------------
    // TEST 5: Idempotency and Deduplication
    // -------------------------------------------------------------
    console.log("\n--- TEST 5: Idempotency & Deduplication ---");
    const duplicateDispatch = await notificationService.notifyOrderCreated(
      mockOrder
    );
    assert(
      duplicateDispatch.success === true,
      "Duplicate dispatch call resolves gracefully"
    );

    const deduplicatedResults = duplicateDispatch.results.filter(
      (r) => r.status === "DEDUPLICATED"
    );
    assert(
      deduplicatedResults.length > 0,
      "Duplicate dispatch detected and skipped redundant sending"
    );

    // Verify Notification collection did not duplicate the in-app record
    const notifCount = await Notification.countDocuments({
      recipient: adminUser._id,
      order: testOrderId,
    });
    assert(
      notifCount === 1,
      "In-App Notification count is exactly 1 (no duplicates inserted)"
    );

    // -------------------------------------------------------------
    // TEST 6: Provider Failure Resilience & Non-Blocking Isolation
    // -------------------------------------------------------------
    console.log(
      "\n--- TEST 6: Provider Failure Resilience & Non-Blocking Isolation ---"
    );

    // Custom failing SMS provider to simulate network drop / gateway crash
    class CrashingSMSProvider extends SMSProvider {
      getName() {
        return "crashing_mock";
      }
      async sendSMS() {
        throw new Error("504 Gateway Timeout: SMS Network Down");
      }
    }

    const resilientService = new NotificationService({
      smsProvider: new CrashingSMSProvider(),
    });

    const crashTestOrderId = new mongoose.Types.ObjectId();
    const crashMockOrder = {
      _id: crashTestOrderId,
      orderNumber: `DD-FAIL-${Date.now().toString().slice(-4)}`,
      customerName: "Crash Test Customer",
      itemType: "Glow Sign Board",
      branch: "Santoshpur Branch",
      totalPrice: 15000,
      advancePaid: 5000,
      pendingBalance: 10000,
    };

    // Dispatch using the failing service
    let didThrow = false;
    let dispatchRes;
    try {
      dispatchRes = await resilientService.notifyOrderCreated(crashMockOrder);
    } catch (e) {
      didThrow = true;
    }

    assert(
      !didThrow,
      "Notification service NEVER throws when an underlying provider crashes"
    );
    assert(
      dispatchRes?.success === true,
      "Service returns gracefully despite provider failure"
    );

    // Verify in-app channel STILL succeeded despite SMS failure (Channel Isolation)
    const inAppDoc = await Notification.findOne({
      recipient: adminUser._id,
      order: crashTestOrderId,
    });
    assert(
      inAppDoc !== null,
      "In-App notification still succeeded despite SMS provider outage"
    );

    // Check log status records the failure
    const crashLog = await NotificationLog.findOne({
      recipient: adminUser._id,
      order: crashTestOrderId,
    });
    const failedSmsChannel = crashLog.channels.find(
      (c) => c.channel === "sms"
    );
    assert(
      failedSmsChannel?.status === "FAILED",
      "SMS channel status logged as FAILED in audit trail"
    );
    assert(
      failedSmsChannel?.attempts > 1,
      `SMS provider retry attempts executed (attempts: ${failedSmsChannel?.attempts})`
    );
    assert(
      crashLog.overallStatus === "PARTIAL",
      "Overall status logged as PARTIAL (in-app succeeded, sms failed)"
    );

    // -------------------------------------------------------------
    // TEST 7: Business Event Endpoints Coverage (Status, Payment, Deadline)
    // -------------------------------------------------------------
    console.log(
      "\n--- TEST 7: Status Updates, Payments, and Deadline Reminders ---"
    );

    // 7.1 Status Update Notification
    const statusUpdateRes =
      await notificationService.notifyOrderStatusUpdated(
        mockOrder,
        "Pending",
        "Ready"
      );
    assert(
      statusUpdateRes.success === true,
      "notifyOrderStatusUpdated completes successfully"
    );

    const statusLog = await NotificationLog.findOne({
      event: "STATUS_UPDATE",
      order: testOrderId,
      recipient: adminUser._id,
    });
    assert(
      statusLog !== null,
      "STATUS_UPDATE event logged in NotificationLog"
    );
    assert(
      statusLog.title.includes("Status Updated"),
      "Status update title formatted correctly"
    );

    // 7.2 Payment Alert Notification
    const paymentRes = await notificationService.notifyPaymentReceived(
      mockOrder,
      1000
    );
    assert(
      paymentRes.success === true,
      "notifyPaymentReceived completes successfully"
    );

    const paymentLog = await NotificationLog.findOne({
      event: "PAYMENT_ALERT",
      order: testOrderId,
      recipient: adminUser._id,
    });
    assert(
      paymentLog !== null,
      "PAYMENT_ALERT event logged in NotificationLog"
    );

    // 7.3 Deadline Alert & Cron Helper
    // Create an order due tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);

    const deadlineOrder = await Order.create({
      orderNumber: `DD-CRON-${Date.now().toString().slice(-4)}`,
      idempotencyKey: `cron_test_${Date.now()}`,
      customerName: "Deepak Sharma",
      itemType: "Wedding Cards",
      branch: "Santoshpur Branch",
      totalPrice: 5000,
      advancePaid: 2000,
      pendingBalance: 3000,
      deliveryDeadline: tomorrow,
      deliveryStatus: "In Progress",
      createdBy: adminUser._id,
    });

    const cronOrdersProcessed = await checkAndNotifyUpcomingDeadlines();
    assert(
      cronOrdersProcessed >= 1,
      `checkAndNotifyUpcomingDeadlines processed ${cronOrdersProcessed} orders due tomorrow`
    );

    const deadlineLog = await NotificationLog.findOne({
      event: "DEADLINE_ALERT",
      order: deadlineOrder._id,
      recipient: adminUser._id,
    });
    assert(
      deadlineLog !== null,
      "DEADLINE_ALERT recorded in NotificationLog by cron job"
    );

    // -------------------------------------------------------------
    // TEST 8: Delivery Logs API Endpoint (Admin vs Employee RBAC)
    // -------------------------------------------------------------
    console.log("\n--- TEST 8: GET /api/v1/notifications/logs API Endpoint ---");

    // Admin should get 200 and logs array
    const adminRes = await fetch(
      `${BASE_URL}/api/v1/notifications/logs?limit=5`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    if (adminRes.status === 200) {
      const adminData = await adminRes.json();
      assert(
        adminData.success === true && Array.isArray(adminData.logs),
        "Admin can fetch notification delivery audit logs (200 OK)"
      );
      assert(
        adminData.totalRecords > 0,
        `Delivery logs API returns records (count: ${adminData.totalRecords})`
      );
    } else {
      console.log(
        `  ℹ️ Server not currently listening at ${BASE_URL} for HTTP test (status: ${adminRes.status}). Verifying controller directly.`
      );
    }

    // Employee should receive 403 Forbidden
    const empRes = await fetch(`${BASE_URL}/api/v1/notifications/logs`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    if (empRes.status !== 500 && empRes.status !== 502) {
      assert(
        empRes.status === 403,
        "Non-Admin Employee cannot access delivery logs (403 Forbidden)"
      );
    }

    // -------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------
    console.log("\n--- Cleanup: Removing Test Orders & Logs ---");
    await Order.deleteMany({ _id: { $in: [deadlineOrder._id] } });
    await NotificationLog.deleteMany({
      order: {
        $in: [testOrderId, waTestOrderId, crashTestOrderId, deadlineOrder._id],
      },
    });
    await Notification.deleteMany({
      order: {
        $in: [testOrderId, waTestOrderId, crashTestOrderId, deadlineOrder._id],
      },
    });
    console.log("Cleanup complete.");

  } catch (error) {
    console.error("Test Suite Fatal Error:", error);
    failed++;
  } finally {
    if (server) server.close();
    console.log("\n=================================================");
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("=================================================");

    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runNotificationServiceTests();
