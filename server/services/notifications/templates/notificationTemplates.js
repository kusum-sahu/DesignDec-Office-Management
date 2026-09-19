/**
 * Centralized template definitions and message generators for all notification channels
 */

export const NOTIFICATION_EVENTS = {
  NEW_ORDER: "NEW_ORDER",
  NEW_BRANCH_ORDER: "NEW_BRANCH_ORDER",
  STATUS_UPDATE: "STATUS_UPDATE",
  PAYMENT_ALERT: "PAYMENT_ALERT",
  DEADLINE_ALERT: "DEADLINE_ALERT",
};

/**
 * Format currency with Indian Rupee symbol
 */
function formatRupee(amount) {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString("en-IN")}`;
}

/**
 * Format standard date
 */
function formatDate(date) {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Generates channel payloads for an event
 * @param {string} event - Event type
 * @param {Object} data - Context data
 * @returns {{ inApp: { title: string, message: string, type: string }, sms: { message: string, templateId?: string }, whatsapp: { message: string, templateName?: string, templateParams?: Array<string> } }}
 */
export function buildNotificationContent(event, data = {}) {
  const {
    orderNumber = "N/A",
    customerName = "Customer",
    itemType = "Item",
    branch = "Main Office",
    totalPrice = 0,
    advancePaid = 0,
    pendingBalance = 0,
    paymentAmount = 0,
    paymentStatus = "Pending",
    deliveryStatus = "Pending",
    oldStatus = "",
    deliveryDeadline = null,
  } = data;

  const formattedDeadline = formatDate(deliveryDeadline);

  switch (event) {
    case NOTIFICATION_EVENTS.NEW_BRANCH_ORDER: {
      const inAppTitle = `🔔 New Branch Order Booked!`;
      const inAppMsg = `${branch} booked order #${orderNumber} for ${customerName} (${itemType}). Total: ${formatRupee(
        totalPrice
      )}, Advance: ${formatRupee(advancePaid)}, Balance: ${formatRupee(
        pendingBalance
      )}.`;

      const smsMsg = `DesignDec Alert: New branch order #${orderNumber} booked at ${branch} for ${customerName} (${itemType}). Total: Rs.${totalPrice}, Advance: Rs.${advancePaid}, Balance: Rs.${pendingBalance}.`;

      const waMsg =
        `🔔 *New Branch Order Booked!*\n\n` +
        `• *Branch:* ${branch}\n` +
        `• *Order #:* ${orderNumber}\n` +
        `• *Customer:* ${customerName}\n` +
        `• *Item:* ${itemType}\n` +
        `• *Total Price:* ${formatRupee(totalPrice)}\n` +
        `• *Advance Paid:* ${formatRupee(advancePaid)}\n` +
        `• *Balance Due:* ${formatRupee(pendingBalance)}\n` +
        `• *Deadline:* ${formattedDeadline}`;

      return {
        inApp: {
          title: inAppTitle,
          message: inAppMsg,
          type: "NEW_BRANCH_ORDER",
        },
        sms: {
          message: smsMsg,
          templateId: "DLT_NEW_BRANCH_ORDER",
        },
        whatsapp: {
          message: waMsg,
          templateName: "new_branch_order_alert",
          templateParams: [
            branch,
            orderNumber,
            customerName,
            itemType,
            String(totalPrice),
            String(advancePaid),
            String(pendingBalance),
          ],
        },
      };
    }

    case NOTIFICATION_EVENTS.NEW_ORDER: {
      const inAppTitle = `📦 New Order Created!`;
      const inAppMsg = `New order #${orderNumber} created at ${branch} for ${customerName} (${itemType}). Total: ${formatRupee(
        totalPrice
      )}, Advance: ${formatRupee(advancePaid)}, Balance: ${formatRupee(
        pendingBalance
      )}.`;

      const smsMsg = `DesignDec Alert: New Order #${orderNumber} created for ${customerName} (${itemType}). Total: Rs.${totalPrice}, Advance: Rs.${advancePaid}. Due: ${formattedDeadline}.`;

      const waMsg =
        `📦 *New Order Created!*\n\n` +
        `• *Branch:* ${branch}\n` +
        `• *Order #:* ${orderNumber}\n` +
        `• *Customer:* ${customerName}\n` +
        `• *Item:* ${itemType}\n` +
        `• *Total Price:* ${formatRupee(totalPrice)}\n` +
        `• *Advance:* ${formatRupee(advancePaid)}\n` +
        `• *Balance Due:* ${formatRupee(pendingBalance)}\n` +
        `• *Deadline:* ${formattedDeadline}`;

      return {
        inApp: {
          title: inAppTitle,
          message: inAppMsg,
          type: "NEW_ORDER",
        },
        sms: {
          message: smsMsg,
          templateId: "DLT_NEW_ORDER",
        },
        whatsapp: {
          message: waMsg,
          templateName: "new_order_created",
          templateParams: [
            orderNumber,
            customerName,
            itemType,
            String(totalPrice),
            formattedDeadline,
          ],
        },
      };
    }

    case NOTIFICATION_EVENTS.STATUS_UPDATE: {
      const statusLabel = oldStatus
        ? `${oldStatus} ➔ ${deliveryStatus}`
        : deliveryStatus;

      const inAppTitle = `🔄 Order #${orderNumber} Status Updated`;
      const inAppMsg = `Order #${orderNumber} for ${customerName} (${itemType}) status changed to "${deliveryStatus}".`;

      const smsMsg = `DesignDec Update: Order #${orderNumber} (${customerName}) delivery status is now "${deliveryStatus}".`;

      const waMsg =
        `🔄 *Order Status Updated!*\n\n` +
        `• *Order #:* ${orderNumber}\n` +
        `• *Customer:* ${customerName}\n` +
        `• *Item:* ${itemType}\n` +
        `• *Status Change:* ${statusLabel}\n` +
        `• *Branch:* ${branch}`;

      return {
        inApp: {
          title: inAppTitle,
          message: inAppMsg,
          type: "STATUS_UPDATE",
        },
        sms: {
          message: smsMsg,
          templateId: "DLT_STATUS_UPDATE",
        },
        whatsapp: {
          message: waMsg,
          templateName: "order_status_update",
          templateParams: [orderNumber, customerName, deliveryStatus, branch],
        },
      };
    }

    case NOTIFICATION_EVENTS.PAYMENT_ALERT: {
      const inAppTitle = `💰 Payment Received: Order #${orderNumber}`;
      const inAppMsg = `Payment of ${formatRupee(
        paymentAmount
      )} recorded for order #${orderNumber} (${customerName}). Remaining balance: ${formatRupee(
        pendingBalance
      )}. Status: ${paymentStatus}.`;

      const smsMsg = `DesignDec Payment: Received Rs.${paymentAmount} for Order #${orderNumber} (${customerName}). Remaining balance: Rs.${pendingBalance}.`;

      const waMsg =
        `💰 *Payment Received!*\n\n` +
        `• *Order #:* ${orderNumber}\n` +
        `• *Customer:* ${customerName}\n` +
        `• *Payment Amount:* ${formatRupee(paymentAmount)}\n` +
        `• *Remaining Balance:* ${formatRupee(pendingBalance)}\n` +
        `• *Payment Status:* ${paymentStatus}\n` +
        `• *Branch:* ${branch}`;

      return {
        inApp: {
          title: inAppTitle,
          message: inAppMsg,
          type: "PAYMENT_ALERT",
        },
        sms: {
          message: smsMsg,
          templateId: "DLT_PAYMENT_ALERT",
        },
        whatsapp: {
          message: waMsg,
          templateName: "payment_received_alert",
          templateParams: [
            orderNumber,
            customerName,
            String(paymentAmount),
            String(pendingBalance),
          ],
        },
      };
    }

    case NOTIFICATION_EVENTS.DEADLINE_ALERT: {
      const inAppTitle = `⚠️ Delivery Deadline Tomorrow!`;
      const inAppMsg = `Order #${orderNumber} for "${customerName}" (${itemType}) is due tomorrow! Status: ${deliveryStatus}. Pending balance: ${formatRupee(
        pendingBalance
      )}.`;

      const smsMsg = `DesignDec Urgent: Order #${orderNumber} for ${customerName} (${itemType}) is due tomorrow! Status: ${deliveryStatus}, Balance: Rs.${pendingBalance}.`;

      const waMsg =
        `⚠️ *Urgent: Delivery Deadline Tomorrow!*\n\n` +
        `• *Order #:* ${orderNumber}\n` +
        `• *Customer:* ${customerName}\n` +
        `• *Item:* ${itemType}\n` +
        `• *Due Date:* ${formattedDeadline} (Tomorrow)\n` +
        `• *Current Status:* ${deliveryStatus}\n` +
        `• *Pending Balance:* ${formatRupee(pendingBalance)}\n` +
        `• *Branch:* ${branch}`;

      return {
        inApp: {
          title: inAppTitle,
          message: inAppMsg,
          type: "DEADLINE_ALERT",
        },
        sms: {
          message: smsMsg,
          templateId: "DLT_DEADLINE_ALERT",
        },
        whatsapp: {
          message: waMsg,
          templateName: "deadline_tomorrow_reminder",
          templateParams: [
            orderNumber,
            customerName,
            itemType,
            deliveryStatus,
            String(pendingBalance),
          ],
        },
      };
    }

    default:
      return {
        inApp: {
          title: data.title || "Notification",
          message: data.message || "You have a new update.",
          type: "STATUS_UPDATE",
        },
        sms: {
          message: data.message || "DesignDec Update",
        },
        whatsapp: {
          message: data.message || "DesignDec Update",
        },
      };
  }
}
