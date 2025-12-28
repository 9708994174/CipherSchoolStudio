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

// MongoDB - Validate environment variable
if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI environment variable is not set!")
  console.error("   Please set MONGODB_URI in your .env file or environment variables.")
  console.error("   Example: mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority")
  process.exit(1)
}

// MongoDB connection options
const mongooseOptions = {
  serverSelectionTimeoutMS: 10000, // 10 seconds
  socketTimeoutMS: 45000, // 45 seconds
  connectTimeoutMS: 10000, // 10 seconds
  retryWrites: true,
  w: 'majority',
  // Add these options to help with connection issues
  useNewUrlParser: true,
  useUnifiedTopology: true,
}

// Parse connection string to check format
const mongoUri = process.env.MONGODB_URI.trim()
console.log("🔗 Attempting to connect to MongoDB...")
console.log("   Connection string format:", mongoUri.includes('mongodb+srv://') ? 'SRV (Atlas)' : 'Standard')

// Check if database name is in connection string
if (!mongoUri.includes('/?') && !mongoUri.match(/\/[^?]+(\?|$)/)) {
  console.warn("⚠️  Warning: Database name might be missing from connection string")
  console.warn("   Recommended format: mongodb+srv://user:pass@cluster.mongodb.net/database?options")
}

mongoose
  .connect(mongoUri, mongooseOptions)
  .then(() => {
    console.log("✅ Connected to MongoDB")
    console.log("   Database:", mongoose.connection.db?.databaseName || 'default')
  })
  .catch(err => {
    console.error("❌ MongoDB connection error:", err.message)
    console.error("\n📋 Troubleshooting steps:")
    console.error("   1. Check if your MongoDB Atlas cluster is running")
    console.error("   2. Verify your connection string in .env file")
    console.error("   3. Check IP whitelist in MongoDB Atlas (allow 0.0.0.0/0 for testing)")
    console.error("   4. Ensure database name is included in connection string")
    console.error("   5. Try using standard connection string if SRV fails:")
    console.error("      mongodb://username:password@cluster-shard-00-00.xxxxx.mongodb.net:27017/database?ssl=true")
    console.error("\n   Current connection string format:", mongoUri.substring(0, 50) + "...")
    
    // Don't exit in development - allow server to start but MongoDB operations will fail
    if (process.env.NODE_ENV === "production") {
      process.exit(1)
    } else {
      console.warn("⚠️  Server will continue without MongoDB connection (development mode)")
    }
  })

// API Routes (must be before static file serving)
app.use("/api/auth", authRoutes)
app.use("/api/assignments", assignmentRoutes)
app.use("/api/query", queryRoutes)
app.use("/api/hints", hintRoutes)
app.use("/api/submit", submitRoutes)

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

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})
