const express = require("express")
const cors = require("cors")
const mongoose = require("mongoose")
const path = require("path")
const fs = require("fs")

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config()
}

const assignmentRoutes = require("./routes/assignments")
const queryRoutes = require("./routes/query")
const hintRoutes = require("./routes/hints")
const submitRoutes = require("./routes/submit")
const authRoutes = require("./routes/auth")
const userRoutes = require("./routes/user")
const discussRoutes = require("./routes/discuss")

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      process.env.CLIENT_URL
    ].filter(Boolean); // Remove undefined values

    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(null, true); // Allow all origins in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// MongoDB - Optional connection (auth now uses PostgreSQL)
// MongoDB connection options
const mongooseOptions = {
  serverSelectionTimeoutMS: 5000, // 5 seconds
  socketTimeoutMS: 45000,
  connectTimeoutMS: 5000,
  retryWrites: true,
  w: 'majority',
}

// Connect to MongoDB if URI is provided (optional - auth uses PostgreSQL)
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
  res.json({ status: "ok", message: "CipherSQLStudio API is running" })
})

// Serve React in production
if (process.env.NODE_ENV === "production") {
  const __dirname = path.resolve()
  const buildPath = path.join(__dirname, "../client/build")

  // Verify build directory exists
  if (!fs.existsSync(buildPath)) {
    console.error(`❌ React build directory not found at: ${buildPath}`)
    console.error("   Make sure the client was built during the Docker build process.")
  } else {
    console.log(`✅ Serving React app from: ${buildPath}`)
  }

  // Serve static files from React build
  app.use(express.static(buildPath))

  // Catch-all handler: send back React's index.html file for any non-API routes
  // This allows React Router to handle client-side routing
  app.get("*", (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"))
  })
}

app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({
    error: err.message || "Internal server error"
  })
})

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})

module.exports = app;
