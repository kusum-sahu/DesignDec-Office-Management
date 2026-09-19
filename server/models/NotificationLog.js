import mongoose from "mongoose";

const channelLogSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      enum: ["in_app", "sms", "whatsapp"],
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "SENT", "FAILED", "SKIPPED"],
      default: "PENDING",
    },
    provider: {
      type: String,
      default: "",
    },
    providerMessageId: {
      type: String,
      default: "",
    },
    recipientTarget: {
      type: String, // User ID or phone number
      default: "",
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const notificationLogSchema = new mongoose.Schema(
  {
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    event: {
      type: String,
      required: true,
      enum: [
        "NEW_ORDER",
        "NEW_BRANCH_ORDER",
        "STATUS_UPDATE",
        "PAYMENT_ALERT",
        "DEADLINE_ALERT",
      ],
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      index: true,
      default: null,
    },
    orderNumber: {
      type: String,
      index: true,
      default: "",
    },
    branch: {
      type: String,
      default: "Main Office",
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipientName: {
      type: String,
      default: "",
    },
    recipientRole: {
      type: String,
      default: "",
    },
    recipientPhone: {
      type: String,
      default: "",
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    channels: [channelLogSchema],
    overallStatus: {
      type: String,
      enum: ["PENDING", "SUCCESS", "PARTIAL", "FAILED", "SKIPPED"],
      default: "PENDING",
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Helpful compound indexes for querying and auditing
notificationLogSchema.index({ event: 1, createdAt: -1 });
notificationLogSchema.index({ branch: 1, createdAt: -1 });
notificationLogSchema.index({ recipient: 1, createdAt: -1 });

const NotificationLog = mongoose.model("NotificationLog", notificationLogSchema);
export default NotificationLog;
