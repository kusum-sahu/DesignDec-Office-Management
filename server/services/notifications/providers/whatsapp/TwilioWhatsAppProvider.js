import { WhatsAppProvider } from "./WhatsAppProvider.js";

export class TwilioWhatsAppProvider extends WhatsAppProvider {
  constructor(config = {}) {
    super();
    this.accountSid = config.accountSid || process.env.TWILIO_ACCOUNT_SID;
    this.authToken = config.authToken || process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber =
      config.fromNumber ||
      process.env.TWILIO_WHATSAPP_NUMBER ||
      process.env.TWILIO_PHONE_NUMBER;
  }

  getName() {
    return "twilio";
  }

  async sendWhatsApp({ to, message, templateName, templateParams, metadata = {} }) {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      throw new Error(
        "Twilio WhatsApp is misconfigured. Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_WHATSAPP_NUMBER."
      );
    }

    const fromFormatted = this.fromNumber.startsWith("whatsapp:")
      ? this.fromNumber
      : `whatsapp:${this.fromNumber}`;

    const toFormatted = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const body = new URLSearchParams({
      From: fromFormatted,
      To: toFormatted,
      Body: message,
    });

    const authHeader = `Basic ${Buffer.from(
      `${this.accountSid}:${this.authToken}`
    ).toString("base64")}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const responseData = await response.json();

    if (!response.ok) {
      const err = new Error(
        `Twilio WhatsApp dispatch failed: ${responseData.message || response.statusText}`
      );
      err.status = response.status;
      err.code = responseData.code;
      if (response.status >= 400 && response.status < 500) {
        err.nonRetryable = true;
      }
      throw err;
    }

    return {
      success: true,
      provider: "twilio",
      messageId: responseData.sid,
      sentAt: new Date(),
      raw: responseData,
    };
  }
}
