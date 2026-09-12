import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
      default: () => "ORD-" + Date.now().toString().slice(-6)
    },
     idempotencyKey: {
      type: String,
      required: true,
      trim: true
    },
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true
    },
    contactNo: {
      type: String,
      required: [true, "Customer contact number is required"],
      trim: true
    },
    itemType: {
      type: String,
      required: true,
      enum: [
        "Flex Banner",
        "Lighting Board",
        "Glow Sign Board",
        "Bill Book",
        "ID Card",
        "Visiting Card",
        "Brochure",
        "Other"
      ]
    },
    description: {
      type: String,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 1
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    advancePaid: {
      type: Number,
      default: 0,
      min: 0
    },
    pendingBalance: {
      type: Number,
      default: 0
    },
    // Branch Tracking
    branch: {
      type: String,
      required: true,
      enum: ["Main Office", "Santoshpur Branch"],
      default: "Main Office"
    },
    // Revenue Share (Main Office vs Branch Office)
    revenueSplit: {
      mainOfficeShare: {
        type: Number,
        default: 0
      },
      branchShare: {
        type: Number,
        default: 0
      }
    },
    orderDate: {
      type: Date,
      default: Date.now
    },
    deliveryDeadline: {
      type: Date,
      required: [true, "Delivery deadline is required"]
    },
    deliveryStatus: {
      type: String,
      enum: ["Pending", "In Progress", "Ready", "Delivered", "Cancelled"],
      default: "Pending"
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Partial", "Paid"],
      default: "Pending"
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

orderSchema.index(
  { createdBy: 1, idempotencyKey: 1 },
  { unique: true }
);

// Calculate pendingBalance & paymentStatus automatically before saving
orderSchema.pre("save", function (next) {
  this.pendingBalance = Math.max(0, this.totalPrice - this.advancePaid);

  if (this.advancePaid >= this.totalPrice) {
    this.paymentStatus = "Paid";
  } else if (this.advancePaid > 0) {
    this.paymentStatus = "Partial";
  } else {
    this.paymentStatus = "Pending";
  }

  // If Main Office order, 100% goes to Main Office by default
  if (this.branch === "Main Office") {
    this.revenueSplit.mainOfficeShare = this.totalPrice;
    this.revenueSplit.branchShare = 0;
  }

  // next();
});

const Order = mongoose.model("Order", orderSchema);
export default Order;