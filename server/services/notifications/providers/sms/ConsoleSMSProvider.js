import { SMSProvider } from "./SMSProvider.js";

export class ConsoleSMSProvider extends SMSProvider {
  constructor(config = {}) {
    super();
    this.senderId = config.senderId || process.env.SMS_SENDER_ID || "DESDEC";
  }

  getName() {
    return "console";
  }

  async sendSMS({ to, message, templateId, metadata = {} }) {
    const timestamp = new Date().toISOString();
    const messageId = `mock_sms_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    console.log("--------------------------------------------------");
    console.log(`📱 [SMS DISPATCH: CONSOLE] Time: ${timestamp}`);
    console.log(`   To: ${to}`);
    console.log(`   Sender: ${this.senderId}`);
    console.log(`   Template: ${templateId || "N/A"}`);
    console.log(`   Length: ${message.length} chars`);
    console.log(`   Content: ${message}`);
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
