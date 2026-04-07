import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import hpp from "hpp";
import rateLimit from "express-rate-limit";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

// Create express app
const app = express();

// Trust proxy if behind a proxy (Heroku/Render/Nginx)
if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

// CORS configuration with allowlist
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map(o => o.trim());

app.use(cors({
  origin: function (origin, callback) {git 
    // allow server-to-server, curl, Postman
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // IMPORTANT: do NOT throw error
    return callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

//  THIS IS CRITICAL
app.options("*", cors());


// Security headers
app.use(helmet());

// Prevent HTTP parameter pollution
app.use(hpp());

// Gzip compression
app.use(compression());

// Body parsers with limits
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Basic rate limiter for API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Root
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// Routes
app.use("/api", userRoutes);
app.use("/api", taskRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ message: "Not Found" });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = process.env.NODE_ENV === "production" ? "Server error" : err.message;
  res.status(status).json({ message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is live at : ${PORT}`);
});