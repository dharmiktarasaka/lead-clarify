const Notification = require("../models/Notification");

// Get notifications for authenticated user
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const unreadCount = await Notification.countDocuments({
      user: req.user.id,
      read: false
    });

    res.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error("getNotifications error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Mark single notification as read
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const unreadCount = await Notification.countDocuments({
      user: req.user.id,
      read: false
    });

    res.json({
      notification,
      unreadCount
    });
  } catch (error) {
    console.error("markAsRead error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Mark all user notifications as read
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, read: false },
      { read: true }
    );

    res.json({
      message: "All notifications marked as read",
      unreadCount: 0
    });
  } catch (error) {
    console.error("markAllAsRead error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Clear all notifications for user
const clearNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user.id });

    res.json({
      message: "All notifications cleared",
      unreadCount: 0
    });
  } catch (error) {
    console.error("clearNotifications error:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearNotifications
};
