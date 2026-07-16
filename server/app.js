import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";

const app = express();

// ===============================
// Middlewares
// ===============================
app.use(cors({
  origin: "http://localhost:5173", // React Frontend URL
  credentials: true,               // Allow Cookies
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

// ===============================
// Health Check API
// ===============================
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "🚀 DesignDec Office Management API is Running",
  });
});

// ===============================
// Authentication Routes
// ===============================
app.use("/api/v1/auth", authRoutes);

export default app;