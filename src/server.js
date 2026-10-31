/**
 * File: website-backend/src/server.js
 * Purpose: Main Express server for the public IoT website API.
 * Port: 5000
 * Database: MongoDB
 */

import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";

import publicRoutes from "./routes/public.js";
import adminRoutes from "./routes/admin.js";

const app = express();

const PORT = Number(process.env.PORT || 5000);

// ======================================================
// ALLOWED FRONTEND ORIGINS
// ======================================================

const allowedOrigins = (
  process.env.CLIENT_ORIGINS ||
  "http://localhost:5173,http://localhost:5174"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// ======================================================
// SECURITY MIDDLEWARE
// ======================================================

app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("Origin not allowed by CORS")
      );
    },
  })
);

app.use(
  express.json({
    limit: "1mb",
  })
);

// ======================================================
// API RATE LIMITING
// ======================================================

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/api/health", (_req, res) => {
  return res.json({
    ok: true,
    service: "iot-website-backend",
    port: PORT,
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});

// ======================================================
// PUBLIC WEBSITE APIs
// ======================================================

app.use("/api", publicRoutes);

// ======================================================
// WEBSITE ADMIN APIs
// ======================================================

app.use("/api/admin", adminRoutes);

// ======================================================
// 404 HANDLER
// ======================================================

app.use((req, res) => {
  return res.status(404).json({
    message: "API endpoint not found.",
    path: req.originalUrl,
  });
});

// ======================================================
// CENTRAL ERROR HANDLER
// ======================================================

app.use((error, _req, res, _next) => {
  console.error("Website API error:", error);

  if (error.message === "Origin not allowed by CORS") {
    return res.status(403).json({
      message: "Origin not allowed.",
    });
  }

  if (
    error.name === "MulterError" &&
    error.code === "LIMIT_FILE_SIZE"
  ) {
    return res.status(413).json({
      message: "Image must be 3 MB or smaller.",
    });
  }

  if (
    error.message?.startsWith("Upload a JPG")
  ) {
    return res.status(400).json({
      message: error.message,
    });
  }

  return res.status(500).json({
    message: "Internal server error.",
  });
});

// ======================================================
// DATABASE CONNECTION AND SERVER START
// ======================================================

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is missing in website-backend/.env"
      );
    }

    await mongoose.connect(
      process.env.MONGODB_URI,
      {
        serverSelectionTimeoutMS: 10000,
      }
    );

    console.log("MongoDB connected successfully.");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `Website API running at http://localhost:${PORT}`
      );
    });

  } catch (error) {
    console.error(
      "Failed to start website backend:",
      error.message
    );

    process.exit(1);
  }
}

startServer();