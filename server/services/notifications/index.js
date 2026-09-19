import {
  NotificationService,
  notificationService,
} from "./NotificationService.js";
import { NOTIFICATION_EVENTS } from "./templates/notificationTemplates.js";
import { resolveBranchRecipients } from "./resolvers/recipientResolver.js";
import { SMSProvider } from "./providers/sms/SMSProvider.js";
import { ConsoleSMSProvider } from "./providers/sms/ConsoleSMSProvider.js";
import { TwilioSMSProvider } from "./providers/sms/TwilioSMSProvider.js";
import { WhatsAppProvider } from "./providers/whatsapp/WhatsAppProvider.js";
import { ConsoleWhatsAppProvider } from "./providers/whatsapp/ConsoleWhatsAppProvider.js";
import { MetaWhatsAppProvider } from "./providers/whatsapp/MetaWhatsAppProvider.js";
import { TwilioWhatsAppProvider } from "./providers/whatsapp/TwilioWhatsAppProvider.js";

export {
  NotificationService,
  notificationService,
  NOTIFICATION_EVENTS,
  resolveBranchRecipients,
  SMSProvider,
  ConsoleSMSProvider,
  TwilioSMSProvider,
  WhatsAppProvider,
  ConsoleWhatsAppProvider,
  MetaWhatsAppProvider,
  TwilioWhatsAppProvider,
};

export default notificationService;
