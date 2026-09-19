// Jab Branch me order aaye toh Main Office ko alert mile.
// Deadline se 1 din pehle reminder alert dono ko mile.
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ["NEW_BRANCH_ORDER", "NEW_ORDER", "DEADLINE_ALERT", "PAYMENT_ALERT", "STATUS_UPDATE"],
      required: true
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order"
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
