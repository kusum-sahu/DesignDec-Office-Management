import mongoose from "mongoose";

const auditTrailEntrySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ["REQUEST_SUBMITTED", "APPROVED", "REJECTED"],
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    performedByRole: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

const attendanceCorrectionSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    attendance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attendance",
      required: true,
      index: true,
    },

    attendanceDate: {
      type: Date,
      required: true,
    },

    requestedCheckOutTime: {
      type: Date,
      required: true,
    },

    requestedCheckInTime: {
      type: Date,
      default: null,
    },

    reason: {
      type: String,
      required: [true, "Correction reason is required."],
      trim: true,
      minlength: [3, "Reason must be at least 3 characters."],
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
      index: true,
    },

    correctedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    correctedAt: {
      type: Date,
      default: null,
    },

    actionReason: {
      type: String,
      default: "",
      trim: true,
    },

    auditTrail: [auditTrailEntrySchema],
  },
  {
    timestamps: true,
  }
);

attendanceCorrectionSchema.index({ employee: 1, attendanceDate: -1 });

const AttendanceCorrection = mongoose.model(
  "AttendanceCorrection",
  attendanceCorrectionSchema
);

export default AttendanceCorrection;
