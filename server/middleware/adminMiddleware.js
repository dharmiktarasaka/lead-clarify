const User = require("../models/User");

const adminOnly = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Double-check user in DB for real-time role & status check
    const user = await User.findById(req.user.id).select("role status");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ message: "Your account is suspended." });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        message: "Forbidden: Admin privileges required."
      });
    }

    req.adminUser = user;
    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    res.status(500).json({ message: "Authorization error" });
  }
};

module.exports = adminOnly;
