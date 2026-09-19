import { retryWithBackoff } from "../utils/retryHelper.js";

/**
 * SMS Notification Channel (Mandatory Business Channel)
 * Dispatches SMS via configured provider with retries and graceful failure
 */
export class SMSChannel {
  /**
   * @param {import('../providers/sms/SMSProvider.js').SMSProvider} provider
   * @param {Object} [options]
   */
  constructor(provider, options = {}) {
    this.name = "sms";
    this.provider = provider;
    this.maxRetries = Number(process.env.NOTIFICATION_RETRY_ATTEMPTS) || 2;
    this.retryDelayMs = Number(process.env.NOTIFICATION_RETRY_DELAY_MS) || 400;
  }

  /**
   * @param {Object} params
   * @param {Object} params.recipient - Resolved recipient object
   * @param {Object} params.content - SMS content { message, templateId }
   * @param {Object} [params.metadata]
   * @returns {Promise<{ channel: string, status: string, provider: string, providerMessageId: string, attempts: number, sentAt: Date|null, lastError?: string }>}
   */
  async send({ recipient, content, metadata = {} }) {
    if (!recipient.hasValidPhone || !recipient.phone) {
      return {
        channel: "sms",
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
          return await this.provider.sendSMS({
            to: recipient.phone,
            message: content.message,
            templateId: content.templateId,
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
          operationName: `SMS to ${recipient.phone}`,
        }
      );

      return {
        channel: "sms",
        status: "SENT",
        provider: result.provider || this.provider.getName(),
        providerMessageId: result.messageId || "",
        recipientTarget: recipient.phone,
        attempts: attemptsCount,
        sentAt: result.sentAt || new Date(),
      };
    } catch (error) {
      console.error(
        `[SMSChannel] All ${attemptsCount} attempts failed for ${recipient.phone}: ${error.message}`
      );
      return {
        channel: "sms",
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
