import { WhatsAppProvider } from "./WhatsAppProvider.js";

export class MetaWhatsAppProvider extends WhatsAppProvider {
  constructor(config = {}) {
    super();
    this.accessToken = config.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = config.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.apiVersion = config.apiVersion || process.env.WHATSAPP_API_VERSION || "v21.0";
  }

  getName() {
    return "meta";
  }

  async sendWhatsApp({ to, message, templateName, templateParams = [], metadata = {} }) {
    if (!this.accessToken || !this.phoneNumberId) {
      throw new Error(
        "Meta WhatsApp is misconfigured. Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID."
      );
    }

    // Strip any leading '+' for Meta API recipient phone
    const cleanTo = to.replace(/\+/g, "").trim();

    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;

    let payload;
    if (templateName) {
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanTo,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en_US" },
          components: templateParams.length
            ? [
                {
                  type: "body",
                  parameters: templateParams.map((p) =>
                    typeof p === "object" ? p : { type: "text", text: String(p) }
                  ),
                },
              ]
            : [],
        },
      };
    } else {
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanTo,
        type: "text",
        text: { preview_url: false, body: message },
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const err = new Error(
        `Meta WhatsApp dispatch failed: ${data.error?.message || response.statusText}`
      );
      err.status = response.status;
      err.code = data.error?.code;
      if (response.status >= 400 && response.status < 500) {
        err.nonRetryable = true;
      }
      throw err;
    }

    const messageId = data.messages?.[0]?.id || `meta_wa_${Date.now()}`;

    return {
      success: true,
      provider: "meta",
      messageId,
      sentAt: new Date(),
      raw: data,
    };
  }
}
