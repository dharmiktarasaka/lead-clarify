const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");
const {
  getStats,
  getUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  updateUserCredits,
  sendCreditsByLookup,
  deleteUser,
  getGlobalLeads,
  getLoginLogs,
  getGeminiStatus,
  testGeminiPing,
  testGeminiLiveLeadAudit
} = require("../controllers/adminController");

// All routes require authentication & admin role
router.use(protect);
router.use(adminOnly);

// Stats & Platform Overview
router.get("/stats", getStats);

// User Management
router.get("/users", getUsers);
router.get("/users/:id", getUserById);
router.patch("/users/:id/status", updateUserStatus);
router.patch("/users/:id/role", updateUserRole);
router.patch("/users/:id/credits", updateUserCredits);
router.post("/users/send-credits", sendCreditsByLookup);
router.delete("/users/:id", deleteUser);

// Global Leads Management
router.get("/leads", getGlobalLeads);

// Login & Session Logs
router.get("/logins", getLoginLogs);

// Google Gemini AI Live Diagnostics & Use Cases (Admin Only)
router.get("/gemini/status", getGeminiStatus);
router.post("/gemini/ping", testGeminiPing);
router.post("/gemini/live-audit", testGeminiLiveLeadAudit);

module.exports = router;
