import express from "express";
import cors from "cors";
import morgan from "morgan";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Health Check API
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "🚀 DesignDec Office Management API is Running",
  });
});

export default app;