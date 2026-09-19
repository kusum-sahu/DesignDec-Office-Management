/**
 * Base SMS Provider interface
 */
export class SMSProvider {
  /**
   * @param {Object} params
   * @param {string} params.to - Recipient phone number (E.164 or normalized)
   * @param {string} params.message - SMS text content
   * @param {string} [params.templateId] - Provider DLT/Template ID
   * @param {Object} [params.metadata] - Extra context
   * @returns {Promise<{ success: boolean, provider: string, messageId: string, raw?: any }>}
   */
  async sendSMS({ to, message, templateId, metadata }) {
    throw new Error("sendSMS() must be implemented by provider");
  }

  getName() {
    return "base_sms";
  }
}
