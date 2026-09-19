import { WhatsAppProvider } from "./WhatsAppProvider.js";

export class ConsoleWhatsAppProvider extends WhatsAppProvider {
  constructor(config = {}) {
    super();
  }

  getName() {
    return "console";
  }

  async sendWhatsApp({ to, message, templateName, templateParams = [], metadata = {} }) {
    const timestamp = new Date().toISOString();
    const messageId = `mock_wa_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    console.log("--------------------------------------------------");
    console.log(`💬 [WHATSAPP DISPATCH: CONSOLE] Time: ${timestamp}`);
    console.log(`   To: ${to}`);
    console.log(`   Template: ${templateName || "custom_text"}`);
    if (templateParams && templateParams.length) {
      console.log(`   Parameters: ${JSON.stringify(templateParams)}`);
    }
    console.log(`   Message:\n${message}`);
    console.log(`   Message ID: ${messageId}`);
    console.log("--------------------------------------------------");

    return {
      success: true,
      provider: "console",
      messageId,
      sentAt: new Date(),
    };
  }
}
