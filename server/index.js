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

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({
  origin: ["http://localhost:3000", process.env.CLIENT_URL],
  credentials: true
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// MongoDB - Validate environment variable
if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI environment variable is not set!")
  console.error("   Please set MONGODB_URI in your Railway environment variables.")
  console.error("   Example: mongodb+srv://username:password@cluster.mongodb.net/database")
  process.exit(1)
}

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => {
    console.error("❌ MongoDB error:", err)
    process.exit(1)
  })

// API Routes (must be before static file serving)
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
