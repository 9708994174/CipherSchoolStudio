const express = require("express")
const cors = require("cors")
const mongoose = require("mongoose")
const path = require("path")

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

// MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB error:", err))

// Serve React in production
if (process.env.NODE_ENV === "production") {
  const __dirname = path.resolve()
  app.use(express.static(path.join(__dirname, "../client/build")))

  app.get("/", (req, res) => {
    res.sendFile(
      path.join(__dirname, "../client/build/index.html")
    )
  })
}

// API Routes
app.use("/api/assignments", assignmentRoutes)
app.use("/api/query", queryRoutes)
app.use("/api/hints", hintRoutes)
app.use("/api/submit", submitRoutes)

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "CipherSQLStudio API is running" })
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({
    error: err.message || "Internal server error"
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})
