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

        branchLocations: {
            type: [
                {
                    branchName: {
                        type: String,
                        required: true,
                        trim: true,
                    },
                    latitude: {
                        type: Number,
                        required: true,
                    },
                    longitude: {
                        type: Number,
                        required: true,
                    },
                    radius: {
                        type: Number,
                        default: 200,
                    },
                    address: {
                        type: String,
                        default: "",
                        trim: true,
                    },
                },
            ],
            default: [
                {
                    branchName: "Main Office",
                    latitude: 19.314962,
                    longitude: 84.794091,
                    radius: 200,
                    address: "Main Office, Berhampur, Ganjam, Odisha",
                },
                {
                    branchName: "Santoshpur Branch",
                    latitude: 20.25880,
                    longitude: 85.78840,
                    radius: 200,
                    address: "Santoshpur Branch, Odisha",
                },
            ],
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