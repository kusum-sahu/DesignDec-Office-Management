import NotificationLog from "../../models/NotificationLog.js";
import { resolveBranchRecipients } from "./resolvers/recipientResolver.js";
import {
  NOTIFICATION_EVENTS,
  buildNotificationContent,
} from "./templates/notificationTemplates.js";
import { InAppChannel } from "./channels/InAppChannel.js";
import { SMSChannel } from "./channels/SMSChannel.js";
import { WhatsAppChannel } from "./channels/WhatsAppChannel.js";

import { ConsoleSMSProvider } from "./providers/sms/ConsoleSMSProvider.js";
import { TwilioSMSProvider } from "./providers/sms/TwilioSMSProvider.js";

import { ConsoleWhatsAppProvider } from "./providers/whatsapp/ConsoleWhatsAppProvider.js";
import { MetaWhatsAppProvider } from "./providers/whatsapp/MetaWhatsAppProvider.js";
import { TwilioWhatsAppProvider } from "./providers/whatsapp/TwilioWhatsAppProvider.js";

/**
 * Production-grade Notification Service
 */
export class NotificationService {
  constructor(config = {}) {
    this.config = config;

    // 1. Initialize SMS Provider (pluggable via SMS_PROVIDER env)
    this.smsProvider = this.initSMSProvider(config.smsProvider);

    // 2. Initialize WhatsApp Provider (pluggable via WHATSAPP_PROVIDER env)
    this.whatsAppProvider = this.initWhatsAppProvider(config.whatsAppProvider);

    // 3. Initialize Channels
    this.inAppChannel = new InAppChannel();
    this.smsChannel = new SMSChannel(this.smsProvider);
    this.whatsAppChannel = new WhatsAppChannel(this.whatsAppProvider);
  }

  /**
   * Instantiate SMS provider based on configuration
   */
  initSMSProvider(customProvider) {
    if (customProvider) return customProvider;

    const providerType = (process.env.SMS_PROVIDER || "console").toLowerCase();
    switch (providerType) {
      case "twilio":
        return new TwilioSMSProvider();
      case "console":
      default:
        return new ConsoleSMSProvider();
    }
  }

  /**
   * Instantiate WhatsApp provider based on configuration
   */
  initWhatsAppProvider(customProvider) {
    if (customProvider) return customProvider;

    const providerType = (
      process.env.WHATSAPP_PROVIDER || "console"
    ).toLowerCase();
    switch (providerType) {
      case "meta":
        return new MetaWhatsAppProvider();
      case "twilio":
        return new TwilioWhatsAppProvider();
      case "console":
      default:
        return new ConsoleWhatsAppProvider();
    }
  }

  /**
   * Main dispatch orchestrator
   * Non-blocking guarantee: Never throws or interrupts business operations
   *
   * @param {Object} params
   * @param {string} params.event - Event type (e.g. NEW_BRANCH_ORDER, STATUS_UPDATE)
   * @param {string} [params.branch] - Branch name
   * @param {Object} [params.order] - Order document / object
   * @param {Object} [params.customData] - Additional parameters
   * @param {string} [params.idempotencyPrefix] - Custom key prefix
   * @returns {Promise<{ success: boolean, recipientCount: number, results: Array<any> }>}
   */
  async dispatch({
    event,
    branch = "Main Office",
    order = null,
    customData = {},
    idempotencyPrefix = "",
  }) {
    try {
      const orderId = order?._id ? String(order._id) : null;
      const orderNumber = order?.orderNumber || customData.orderNumber || "";
      const targetBranch = branch || order?.branch || "Main Office";

      // 1. Dynamically resolve active Admins and Branch Managers from DB
      const recipients = await resolveBranchRecipients({
        branch: targetBranch,
        event,
      });

      if (!recipients.length) {
        console.warn(
          `[NotificationService] No active recipients found for event "${event}" in branch "${targetBranch}".`
        );
        return { success: true, recipientCount: 0, results: [] };
      }

      // 2. Prepare content payload from templates
      const templateData = {
        orderNumber,
        customerName: order?.customerName || customData.customerName || "Customer",
        itemType: order?.itemType || customData.itemType || "Item",
        branch: targetBranch,
        totalPrice: order?.totalPrice ?? customData.totalPrice ?? 0,
        advancePaid: order?.advancePaid ?? customData.advancePaid ?? 0,
        pendingBalance: order?.pendingBalance ?? customData.pendingBalance ?? 0,
        paymentAmount: customData.paymentAmount ?? 0,
        paymentStatus: order?.paymentStatus || customData.paymentStatus || "Pending",
        deliveryStatus: order?.deliveryStatus || customData.deliveryStatus || "Pending",
        oldStatus: customData.oldStatus || "",
        deliveryDeadline: order?.deliveryDeadline || customData.deliveryDeadline,
        ...customData,
      };

      const content = buildNotificationContent(event, templateData);

      // 3. Process dispatch for each recipient in parallel with channel isolation
      const results = await Promise.all(
        recipients.map((recipient) =>
          this.dispatchToRecipient({
            recipient,
            event,
            branch: targetBranch,
            orderId,
            orderNumber,
            content,
            templateData,
            idempotencyPrefix,
          })
        )
      );

      return {
        success: true,
        recipientCount: recipients.length,
        results,
      };
    } catch (error) {
      // Non-blocking fault isolation: Log and swallow top-level dispatch failure
      console.error(
        `[NotificationService] Unexpected dispatch error for event "${event}":`,
        error
      );
      return {
        success: false,
        recipientCount: 0,
        error: error.message,
        results: [],
      };
    }
  }

  /**
   * Internal method to dispatch to a single resolved recipient across all channels
   */
  async dispatchToRecipient({
    recipient,
    event,
    branch,
    orderId,
    orderNumber,
    content,
    templateData,
    idempotencyPrefix,
  }) {
    // Generate unique idempotency key for this recipient & event
    const prefix = idempotencyPrefix || `${event}_${orderId || "gen"}`;
    const idempotencyKey = `${prefix}_${recipient.userId}`;

    try {
      // Check existing log for deduplication
      const existingLog = await NotificationLog.findOne({ idempotencyKey });
      if (existingLog && existingLog.overallStatus === "SUCCESS") {
        console.log(
          `[NotificationService] Deduplicated: Notification with key "${idempotencyKey}" was already sent to ${recipient.name} (${recipient.userId}).`
        );
        return {
          recipientId: recipient.userId,
          status: "DEDUPLICATED",
          logId: existingLog._id,
        };
      }

      // Initialize or find audit log
      let logDoc =
        existingLog ||
        (await NotificationLog.create({
          idempotencyKey,
          event,
          order: orderId,
          orderNumber,
          branch,
          recipient: recipient.userId,
          recipientName: recipient.name,
          recipientRole: recipient.role,
          recipientPhone: recipient.phone || "",
          title: content.inApp.title,
          message: content.inApp.message,
          channels: [],
          overallStatus: "PENDING",
          metadata: {
            customerName: templateData.customerName,
            totalPrice: templateData.totalPrice,
            advancePaid: templateData.advancePaid,
            pendingBalance: templateData.pendingBalance,
          },
        }));

      // Execute all channels in parallel with fault isolation
      const channelPromises = [
        // 1. Mandatory In-App Channel
        this.inAppChannel.send({
          recipient,
          content: content.inApp,
          orderId,
        }),
        // 2. Mandatory Business SMS Channel
        this.smsChannel.send({
          recipient,
          content: content.sms,
          metadata: { orderId, orderNumber, branch, event },
        }),
        // 3. Optional / Configurable WhatsApp Channel
        this.whatsAppChannel.send({
          recipient,
          content: content.whatsapp,
          metadata: { orderId, orderNumber, branch, event },
        }),
      ];

      const settledResults = await Promise.allSettled(channelPromises);

      const channelLogs = settledResults.map((settled, index) => {
        const channelName = ["in_app", "sms", "whatsapp"][index];
        if (settled.status === "fulfilled") {
          return settled.value;
        } else {
          return {
            channel: channelName,
            status: "FAILED",
            provider: "error",
            providerMessageId: "",
            recipientTarget: recipient.phone || recipient.userId,
            attempts: 1,
            lastError: settled.reason?.message || "Unknown channel exception",
            sentAt: null,
          };
        }
      });

      // Calculate overall status
      const hasSent = channelLogs.some((c) => c.status === "SENT");
      const hasFailed = channelLogs.some((c) => c.status === "FAILED");
      let overallStatus = "SKIPPED";

      if (hasSent && !hasFailed) {
        overallStatus = "SUCCESS";
      } else if (hasSent && hasFailed) {
        overallStatus = "PARTIAL";
      } else if (hasFailed) {
        overallStatus = "FAILED";
      }

      // Update log document
      logDoc.channels = channelLogs;
      logDoc.overallStatus = overallStatus;
      await logDoc.save();

      return {
        recipientId: recipient.userId,
        status: overallStatus,
        channels: channelLogs,
        logId: logDoc._id,
      };
    } catch (recipientError) {
      console.error(
        `[NotificationService] Error dispatching to recipient ${recipient.userId}:`,
        recipientError
      );
      return {
        recipientId: recipient.userId,
        status: "FAILED",
        error: recipientError.message,
      };
    }
  }

  // =========================================================================
  // Business Event Convenience Methods
  // =========================================================================

  /**
   * 1. Order Created Notification
   * Dispatches NEW_BRANCH_ORDER if branch is Santoshpur Branch (or other branch),
   * or NEW_ORDER if branch is Main Office.
   */
  async notifyOrderCreated(order) {
    if (!order) return;
    const isBranchOrder = order.branch && order.branch !== "Main Office";
    const event = isBranchOrder
      ? NOTIFICATION_EVENTS.NEW_BRANCH_ORDER
      : NOTIFICATION_EVENTS.NEW_ORDER;

    return this.dispatch({
      event,
      branch: order.branch || "Main Office",
      order,
      idempotencyPrefix: `order_create_${order._id}`,
    });
  }

  /**
   * 2. Order Status Update Notification
   */
  async notifyOrderStatusUpdated(order, oldStatus, newStatus) {
    if (!order) return;
    return this.dispatch({
      event: NOTIFICATION_EVENTS.STATUS_UPDATE,
      branch: order.branch || "Main Office",
      order,
      customData: {
        oldStatus: oldStatus || "",
        deliveryStatus: newStatus || order.deliveryStatus,
      },
      idempotencyPrefix: `status_${order._id}_${newStatus}`,
    });
  }

  /**
   * 3. Payment Received Notification
   */
  async notifyPaymentReceived(order, paymentAmount) {
    if (!order) return;
    return this.dispatch({
      event: NOTIFICATION_EVENTS.PAYMENT_ALERT,
      branch: order.branch || "Main Office",
      order,
      customData: {
        paymentAmount,
        pendingBalance: order.pendingBalance,
        paymentStatus: order.paymentStatus,
      },
      idempotencyPrefix: `payment_${order._id}_${order.advancePaid}_${paymentAmount}`,
    });
  }

  /**
   * 4. Delivery Deadline Reminder Alert (Due Tomorrow)
   */
  async notifyDeadlineAlert(order) {
    if (!order) return;
    const dateStr = new Date().toISOString().slice(0, 10);
    return this.dispatch({
      event: NOTIFICATION_EVENTS.DEADLINE_ALERT,
      branch: order.branch || "Main Office",
      order,
      customData: {
        deliveryDeadline: order.deliveryDeadline,
      },
      // Idempotency key scoped to date to prevent multiple alerts on the same day
      idempotencyPrefix: `deadline_${order._id}_${dateStr}`,
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
