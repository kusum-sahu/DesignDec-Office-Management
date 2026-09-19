import { retryWithBackoff } from "../utils/retryHelper.js";

/**
 * WhatsApp Notification Channel (Optional / Configurable Channel)
 * Dispatches WhatsApp messages when enabled in environment configuration
 */
export class WhatsAppChannel {
  /**
   * @param {import('../providers/whatsapp/WhatsAppProvider.js').WhatsAppProvider} provider
   */
  constructor(provider) {
    this.name = "whatsapp";
    this.provider = provider;
    this.maxRetries = Number(process.env.NOTIFICATION_RETRY_ATTEMPTS) || 2;
    this.retryDelayMs = Number(process.env.NOTIFICATION_RETRY_DELAY_MS) || 400;
  }

  /**
   * Check if WhatsApp channel is actively enabled
   */
  isEnabled() {
    return (
      process.env.WHATSAPP_ENABLED === "true" ||
      process.env.WHATSAPP_ENABLED === true
    );
  }

  /**
   * @param {Object} params
   * @param {Object} params.recipient - Resolved recipient object
   * @param {Object} params.content - WhatsApp content { message, templateName, templateParams }
   * @param {Object} [params.metadata]
   * @returns {Promise<{ channel: string, status: string, provider: string, providerMessageId: string, attempts: number, sentAt: Date|null, lastError?: string }>}
   */
  async send({ recipient, content, metadata = {} }) {
    // 1. Channel enabled check
    if (!this.isEnabled()) {
      return {
        channel: "whatsapp",
        status: "SKIPPED",
        provider: this.provider ? this.provider.getName() : "disabled",
        providerMessageId: "",
        recipientTarget: recipient.userId,
        attempts: 0,
        lastError: "WhatsApp channel disabled via WHATSAPP_ENABLED config",
        sentAt: null,
      };
    }

    // 2. Phone number validity check
    if (!recipient.hasValidPhone || !recipient.phone) {
      return {
        channel: "whatsapp",
        status: "SKIPPED",
        provider: this.provider.getName(),
        providerMessageId: "",
        recipientTarget: recipient.userId,
        attempts: 0,
        lastError: "Recipient has no valid phone number configured in database",
        sentAt: null,
      };
    }

    let attemptsCount = 0;
    try {
      const result = await retryWithBackoff(
        async (attempt) => {
          attemptsCount = attempt;
          return await this.provider.sendWhatsApp({
            to: recipient.phone,
            message: content.message,
            templateName: content.templateName,
            templateParams: content.templateParams,
            metadata: {
              ...metadata,
              recipientId: recipient.userId,
              recipientName: recipient.name,
              recipientRole: recipient.role,
            },
          });
        },
        {
          maxRetries: this.maxRetries,
          initialDelayMs: this.retryDelayMs,
          operationName: `WhatsApp to ${recipient.phone}`,
        }
      );

      return {
        channel: "whatsapp",
        status: "SENT",
        provider: result.provider || this.provider.getName(),
        providerMessageId: result.messageId || "",
        recipientTarget: recipient.phone,
        attempts: attemptsCount,
        sentAt: result.sentAt || new Date(),
      };
    } catch (error) {
      console.error(
        `[WhatsAppChannel] All ${attemptsCount} attempts failed for ${recipient.phone}: ${error.message}`
      );
      return {
        channel: "whatsapp",
        status: "FAILED",
        provider: this.provider.getName(),
        providerMessageId: "",
        recipientTarget: recipient.phone,
        attempts: attemptsCount,
        lastError: error.message,
        sentAt: null,
      };
    }
  }
}
