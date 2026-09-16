const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const leadRoutes = require("./routes/leadRoutes");
const aiRoutes = require("./routes/aiRoutes");
const adminRoutes = require("./routes/adminRoutes");
require("dotenv").config();

const connectDB = require("./config/db");

const app = express();

connectDB();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/admin", adminRoutes);

// Fallback aliases in case request is sent without /api prefix
app.use("/auth", authRoutes);
app.use("/leads", leadRoutes);
app.use("/ai", aiRoutes);
app.use("/admin", adminRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "AI Lead Agent API is running"
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});