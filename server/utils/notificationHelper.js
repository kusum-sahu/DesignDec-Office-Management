import notificationService from "../services/notifications/NotificationService.js";

/**
 * Send notification to all Admins (Main Office)
 * Seamlessly delegated to production NotificationService
 */
export const notifyAdmins = async ({ title, message, type, orderId }) => {
  try {
    await notificationService.dispatch({
      event: type || "STATUS_UPDATE",
      branch: "Main Office",
      customData: {
        title,
        message,
        orderId,
      },
      idempotencyPrefix: `legacy_admin_${orderId || Date.now()}`,
    });
  } catch (error) {
    console.error("[NotificationHelper] Error notifying admins:", error);
  }
};

/**
 * Send notification to Admin + Specific Branch Staff/Managers
 * Seamlessly delegated to production NotificationService
 */
export const notifyBothOffices = async ({
  title,
  message,
  type,
  orderId,
  branchName,
}) => {
  try {
    await notificationService.dispatch({
      event: type || "STATUS_UPDATE",
      branch: branchName || "Main Office",
      customData: {
        title,
        message,
        orderId,
      },
      idempotencyPrefix: `legacy_both_${orderId || Date.now()}`,
    });
  } catch (error) {
    console.error("[NotificationHelper] Error notifying both offices:", error);
  }
};