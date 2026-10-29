import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import publicRoutes from "./routes/public.js";
import adminRoutes from "./routes/admin.js";

const app = express();
const port = Number(process.env.PORT || 5001);
const origins = (process.env.CLIENT_ORIGINS || "http://localhost:5173,http://localhost:5174")
  .split(",").map((origin) => origin.trim()).filter(Boolean);

app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || origins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed by CORS"));
  },
}));
app.use(express.json({ limit: "1mb" }));
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 200, standardHeaders: true, legacyHeaders: false }));
app.get("/api/health", (_req, res) => res.json({
  ok: true, service: "iot-website-backend",
  database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
}));
app.use("/api", publicRoutes);
app.use("/api/admin", adminRoutes);
app.use((err, _req, res, _next) => {
  console.error("Website API error:", err.message);
  if (err.message === "Origin not allowed by CORS") return res.status(403).json({ message: "Origin not allowed." });
  if (err.name === "MulterError" && err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ message: "Image must be 3 MB or smaller." });
  if (err.message?.startsWith("Upload a JPG")) return res.status(400).json({ message: err.message });
  return res.status(500).json({ message: "Server error. Check website backend logs." });
});
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is missing in website-backend/.env");
  process.exit(1);
}
try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log("MongoDB connected successfully.");
  app.listen(port, () => console.log(`Website API running at http://localhost:${port}`));
} catch (error) {
  console.error("Failed to start website backend:", error.message);
  process.exit(1);
}
