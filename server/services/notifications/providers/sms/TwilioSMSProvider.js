import { SMSProvider } from "./SMSProvider.js";

export class TwilioSMSProvider extends SMSProvider {
  constructor(config = {}) {
    super();
    this.accountSid = config.accountSid || process.env.TWILIO_ACCOUNT_SID;
    this.authToken = config.authToken || process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = config.fromNumber || process.env.TWILIO_PHONE_NUMBER;
  }

  getName() {
    return "twilio";
  }

  async sendSMS({ to, message, templateId, metadata = {} }) {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      throw new Error(
        "Twilio SMS is misconfigured. Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER."
      );
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const body = new URLSearchParams({
      From: this.fromNumber,
      To: to,
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
        `Twilio SMS dispatch failed: ${responseData.message || response.statusText}`
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
