import mongoose from "mongoose";

const attendanceSettingSchema = new mongoose.Schema(
    {

        officeStartTime: {
            type: String,
            default: "09:30",
            trim: true,
        },

        officeEndTime: {
            type: String,
            default: "18:30",
            trim: true,
        },

        standardWorkingHours: {
            type: Number,
            default: 9,
            min: 1,
        },

        overtimeAfterHours: {
            type: Number,
            default: 9,
            min: 1,
        },

        lateGraceMinutes: {
            type: Number,
            default: 10,
            min: 0,
        },

        halfDayHours: {
            type: Number,
            default: 4.5,
            min: 1,
        },

        allowOvertime: {
            type: Boolean,
            default: true,
        },

        attendanceRadius: {
            type: Number,
            default: 200,
        },

        isActive: {
            type: Boolean,
            default: true,
        }

    },
    {
        timestamps: true,
    }
);

export default mongoose.model(
    "AttendanceSetting",
    attendanceSettingSchema
);