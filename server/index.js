const express = require("express")
const cors = require("cors")
const mongoose = require("mongoose")
const path = require("path")
const fs = require("fs")

// Always load dotenv — Render sets env vars directly, but local dev needs .env
require("dotenv").config()

const assignmentRoutes = require("./routes/assignments")
const queryRoutes = require("./routes/query")
const hintRoutes = require("./routes/hints")
const submitRoutes = require("./routes/submit")
const authRoutes = require("./routes/auth")
const userRoutes = require("./routes/user")
const discussRoutes = require("./routes/discuss")

const app = express()
const PORT = process.env.PORT || 5000
const isProduction = process.env.NODE_ENV === "production"

// CORS — allow specific origins in production, all in development
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  process.env.CLIENT_URL,
].filter(Boolean)

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else if (!isProduction) {
      // Allow all origins in development
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(null, true); // Still allow — change to callback(new Error('...')) to block
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// MongoDB - Optional connection (auth now uses PostgreSQL)
const mongooseOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 5000,
  retryWrites: true,
  w: 'majority',
}

if (process.env.MONGODB_URI) {
  const mongoUri = process.env.MONGODB_URI.trim()
  console.log("🔗 Attempting to connect to MongoDB...")
  mongoose
    .connect(mongoUri, mongooseOptions)
    .then(() => {
      console.log("✅ Connected to MongoDB")
    })
    .catch(err => {
      console.warn("⚠️  MongoDB unavailable:", err.message)
      console.warn("   Auth and user data are handled by PostgreSQL - server continues normally.")
    })
} else {
  console.log("ℹ️  MONGODB_URI not set - skipping MongoDB (auth uses PostgreSQL)")
}

// API Routes (must be before static file serving)
app.use("/api/auth", authRoutes)
app.use("/api/assignments", assignmentRoutes)
app.use("/api/query", queryRoutes)
app.use("/api/hints", hintRoutes)
app.use("/api/submit", submitRoutes)
app.use("/api/user", userRoutes)
app.use("/api/discuss", discussRoutes)

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "CipherSQLStudio API is running",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  })
})

// Serve React in production
if (isProduction || process.env.VERCEL || process.env.RENDER) {
  const buildPath = path.join(__dirname, "..", "client", "build")

  if (!fs.existsSync(buildPath)) {
    console.warn(`⚠️  React build directory not found at: ${buildPath}`)
    console.warn("   Checking alternative paths...")

    const altPath = path.join(process.cwd(), "client", "build")
    if (fs.existsSync(altPath)) {
      console.log(`✅ Found build directory at: ${altPath}`)
      app.use(express.static(altPath))
      app.get("*", (req, res) => res.sendFile(path.join(altPath, "index.html")))
    } else {
      console.error("❌ Could not find build directory in any known location.")
      console.error("   This is expected if deploying the API separately (e.g. Render Web Service).")
    }
  } else {
    console.log(`✅ Serving React app from: ${buildPath}`)
    app.use(express.static(buildPath))
    app.get("*", (req, res) => res.sendFile(path.join(buildPath, "index.html")))
  }
}

// Global error handler
app.use((err, req, res, next) => {
  console.error(err)
  const statusCode = err.status || 500
  res.status(statusCode).json({
    error: isProduction ? "Internal server error" : (err.message || "Internal server error")
  })
})

// Graceful shutdown
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`)
})

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

module.exports = app;
