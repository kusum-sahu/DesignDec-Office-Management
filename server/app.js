import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import employeeRoutes from "./routes/employee.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import orderRoutes from "./routes/order.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import path from "path";

const app = express();
console.log("Dashboard Routes Loaded");
// Middlewares
app.use(cors({
  origin: "http://localhost:5173", // React Frontend URL
  credentials: true,               // Allow Cookies
}));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));
// Health Check API
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "🚀 DesignDec Office Management API is Running",
  });
});
// Authentication Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/employees", employeeRoutes);
app.use("/api/v1/attendance", attendanceRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/notifications", notificationRoutes);
export default app;