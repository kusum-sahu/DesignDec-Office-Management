import User from "../models/User.js";
import Attendance from "../models/Attendance.js";

//! Dashboard Statistics API 
export const getDashboardStatistics = async (req, res) => {
    try {
        const admin = await User.findById(req.user._id);
        if (!admin) {
            return res.status(404).json({
                success:false,
                message:"Admin not found."
            });
        }
        if(admin.role !== "Admin"){
            return res.status(403).json({
                success:false,
                message:"Access denied."
            });
        }
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0,0,0,0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23,59,59,999);
// Dashboard Statistics
const totalEmployees = await User.countDocuments({
    role: "Employee",
    status: "Active"
});
const presentToday = await Attendance.countDocuments({
    attendanceDate: {
        $gte: startOfDay,
        $lte: endOfDay
    }
});
const checkedIn = await Attendance.countDocuments({
    attendanceDate: {
        $gte: startOfDay,
        $lte: endOfDay
    },
    "checkIn.time": {
        $ne: null
    }
});
const checkedOut = await Attendance.countDocuments({
    attendanceDate: {
        $gte: startOfDay,
        $lte: endOfDay
    },
    "checkOut.time": {
        $ne: null
    }
});
const lateEmployees = await Attendance.countDocuments({
    attendanceDate: {
        $gte: startOfDay,
        $lte: endOfDay
    },
    attendanceStatus: "Late"
});
const absentToday = totalEmployees - presentToday;
    return res.status(200).json({
    success: true,
    message: "Dashboard statistics fetched successfully.",
    statistics: {
        totalEmployees,
        presentToday,
        absentToday,
        checkedIn,
        checkedOut,
        lateEmployees
    }
});
    } catch(error){
        console.error(error);
        return res.status(500).json({
            success:false,
            message:"Internal Server Error."
        });
    }
};
//! Today's Attendance API 
export const getTodayAttendance = async (req, res) => {

    try {

        const admin = await User.findById(req.user._id);

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found."
            });
        }

        if (admin.role !== "Admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied."
            });
        }

        const today = new Date();

        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const attendance = await Attendance.find({

            attendanceDate: {
                $gte: startOfDay,
                $lte: endOfDay
            }

        })

        .populate({

            path: "employee",

            select: "employeeId name department designation"

        })

        .select(
            "attendanceDate checkIn checkOut attendanceStatus workingHours overtimeHours employee"
        )

        .sort({
            checkIn: 1
        })

        .lean();

        return res.status(200).json({

            success: true,

            message: "Today's attendance fetched successfully.",

            totalRecords: attendance.length,

            data: attendance

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,

            message: "Internal Server Error."

        });

    }

};