const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearNotifications
} = require("../controllers/notificationController");

// All notification routes require authenticated user
router.use(protect);

router.get("/", getNotifications);
router.patch("/:id/read", markAsRead);
router.post("/mark-all-read", markAllAsRead);
router.delete("/clear-all", clearNotifications);

module.exports = router;
