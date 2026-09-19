import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    attendanceDate: {
      type: Date,
      required: true,
      index: true,
    },

    checkIn: {
      time: {
        type: Date,
        default: null,
      },

      location: {
        latitude: Number,
        longitude: Number,
        accuracy: {
          type: Number,
          default: null,
        },
        address: {
          type: String,
          default: "",
        },
      },

      photo: {
        type: String,
        default: "",
      },

      device: {
        type: String,
        default: "",
      },

      ipAddress: {
        type: String,
        default: "",
      },
    },

    checkOut: {
      time: {
        type: Date,
        default: null,
      },

      location: {
        latitude: Number,
        longitude: Number,
        accuracy: {
          type: Number,
          default: null,
        },
        address: {
          type: String,
          default: "",
        },
      },

      photo: {
        type: String,
        default: "",
      },

      device: {
        type: String,
        default: "",
      },

      ipAddress: {
        type: String,
        default: "",
      },
    },

    workingHours: {
      type: Number,
      default: 0,
    },

    overtimeHours: {
      type: Number,
      default: 0,
    },

    shift: {
      type: String,
      enum: ["General", "Morning", "Evening", "Night"],
      default: "General",
    },

    attendanceStatus: {
      type: String,
      enum: [
        "Present",
        "Absent",
        "Late",
        "Half Day",
        "Leave",
        "Holiday",
        "Weekend",
        "Work From Home",
      ],
      default: "Absent",
    },

    isLate: {
      type: Boolean,
      default: false,
    },

    isManual: {
      type: Boolean,
      default: false,
    },

    manualReason: {
      type: String,
      default: "",
    },

    remarks: {
      type: String,
      default: "",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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

    hasPendingCorrection: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

attendanceSchema.index(
  {
    employee: 1,
    attendanceDate: 1,
  },
  {
    unique: true,
  },
);

const Attendance = mongoose.model("Attendance", attendanceSchema);

export default Attendance;
