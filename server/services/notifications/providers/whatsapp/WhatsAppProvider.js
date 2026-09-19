/**
 * Base WhatsApp Provider interface
 */
export class WhatsAppProvider {
  /**
   * @param {Object} params
   * @param {string} params.to - Recipient phone number (normalized)
   * @param {string} params.message - Formatted WhatsApp text content
   * @param {string} [params.templateName] - Template identifier (Meta Cloud API)
   * @param {Array<any>} [params.templateParams] - Template component parameters
   * @param {Object} [params.metadata] - Extra context
   * @returns {Promise<{ success: boolean, provider: string, messageId: string, raw?: any }>}
   */
  async sendWhatsApp({ to, message, templateName, templateParams, metadata }) {
    throw new Error("sendWhatsApp() must be implemented by provider");
  }

  getName() {
    return "base_whatsapp";
  }
}
