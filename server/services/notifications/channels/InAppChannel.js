import Notification from "../../../models/Notification.js";

/**
 * In-App Notification Channel (Mandatory)
 * Creates in-app Notification documents in MongoDB for user views
 */
export class InAppChannel {
  constructor() {
    this.name = "in_app";
  }

  /**
   * @param {Object} params
   * @param {Object} params.recipient - Resolved recipient object
   * @param {Object} params.content - Channel content (title, message, type)
   * @param {string} [params.orderId] - Associated order ID
   * @returns {Promise<{ channel: string, status: string, provider: string, providerMessageId: string, attempts: number, sentAt: Date|null, lastError?: string }>}
   */
  async send({ recipient, content, orderId }) {
    try {
      const doc = await Notification.create({
        recipient: recipient.userId,
        title: content.title,
        message: content.message,
        type: content.type || "STATUS_UPDATE",
        order: orderId || null,
        isRead: false,
      });

      return {
        channel: "in_app",
        status: "SENT",
        provider: "mongodb",
        providerMessageId: String(doc._id),
        recipientTarget: recipient.userId,
        attempts: 1,
        sentAt: new Date(),
      };
    } catch (error) {
      console.error(
        `[InAppChannel] Failed to create in-app notification for ${recipient.userId}:`,
        error
      );
      return {
        channel: "in_app",
        status: "FAILED",
        provider: "mongodb",
        providerMessageId: "",
        recipientTarget: recipient.userId,
        attempts: 1,
        lastError: error.message,
        sentAt: null,
      };
    }
  }
}
