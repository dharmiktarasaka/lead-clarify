import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { MenuIcon, BellIcon, SparklesIcon } from "@animateicons/react/lucide";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearAllNotifications
} from "../services/api";

const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 45) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const Navbar = ({ onMenuToggle }) => {
  const { user, refreshUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchUserNotifications = async () => {
    try {
      const { data } = await getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // Silently ignore if unauthenticated or network error
    }
  };

  useEffect(() => {
    fetchUserNotifications();

    // Auto-refresh when returning to tab
    const handleFocus = () => fetchUserNotifications();
    window.addEventListener("focus", handleFocus);

    // Refresh when credits are updated anywhere in app
    const handleCreditsUpdated = () => {
      fetchUserNotifications();
    };
    window.addEventListener("creditsUpdated", handleCreditsUpdated);

    // Periodic check every 25 seconds
    const interval = setInterval(fetchUserNotifications, 25000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("creditsUpdated", handleCreditsUpdated);
      clearInterval(interval);
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggleDropdown = () => {
    if (!isOpen) {
      fetchUserNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleItemClick = async (notif) => {
    if (!notif.read) {
      try {
        await markNotificationRead(notif._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Failed to mark notification read:", err);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  };

  return (
    <header className="navbar">
      <button className="navbar__menu-btn" onClick={onMenuToggle} title="Toggle navigation">
        <MenuIcon size={20} />
      </button>

      <div className="navbar__spacer"></div>

      <div className="navbar__actions" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Live Credits Counter with Instant Refresh */}
        <div
          className="navbar__credits"
          onClick={() => refreshUser && refreshUser()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 12px",
            background: "linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(99, 102, 241, 0.03))",
            border: "1px solid rgba(79, 70, 229, 0.25)",
            borderRadius: "20px",
            fontSize: "13px",
            fontWeight: "700",
            color: "#4F46E5",
            boxShadow: "0 1px 2px rgba(79, 70, 229, 0.05)",
            cursor: "pointer"
          }}
          title="Your Live Credits Balance. Click anytime to refresh directly from server!"
        >
          <span style={{ fontSize: "14px" }}>⚡</span>
          <span>{user?.credits !== undefined ? user.credits.toLocaleString() : "1,000"}</span>
          <span style={{ fontSize: "11px", fontWeight: "600", opacity: 0.75 }}>Credits</span>
        </div>

        {/* Real In-App Notification Bell & Dropdown */}
        <div style={{ position: "relative" }} ref={dropdownRef}>
          <button
            className="navbar__notification"
            onClick={handleToggleDropdown}
            title={unreadCount > 0 ? `${unreadCount} unread notification(s)` : "Notifications"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: isOpen ? "var(--bg-tertiary)" : undefined
            }}
          >
            <BellIcon size={18} />
            {unreadCount > 0 && (
              <span className="navbar__badge">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Card */}
          {isOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: "340px",
                maxWidth: "92vw",
                background: "#FFFFFF",
                borderRadius: "12px",
                border: "1px solid #DDE3EC",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
                zIndex: 1000,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column"
              }}
            >
              {/* Dropdown Header */}
              <div
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid #EEF2F6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#F8FAFC"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <strong style={{ fontSize: "14px", color: "#172033", fontWeight: "800" }}>
                    Notifications
                  </strong>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        padding: "1px 7px",
                        borderRadius: "10px",
                        background: "#EEF2FF",
                        color: "#4F46E5"
                      }}
                    >
                      {unreadCount} new
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#4F46E5",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      padding: "2px 4px"
                    }}
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div style={{ maxHeight: "360px", overflowY: "auto" }}>
                {notifications.length === 0 ? (
                  <div
                    style={{
                      padding: "36px 20px",
                      textAlign: "center",
                      color: "#5B667A",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "8px"
                    }}
                  >
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "50%",
                        background: "#EEF2FF",
                        color: "#4F46E5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <SparklesIcon size={20} />
                    </div>
                    <strong style={{ fontSize: "13px", color: "#172033" }}>No new notifications</strong>
                    <p style={{ fontSize: "12px", margin: 0, color: "#8A94A6", maxWidth: "220px" }}>
                      When an administrator sends you credits, your notification will appear right here.
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => handleItemClick(n)}
                      style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid #F1F5F9",
                        cursor: "pointer",
                        background: n.read ? "#FFFFFF" : "#F8FAFC",
                        transition: "background 0.15s ease",
                        display: "flex",
                        gap: "12px",
                        alignItems: "flex-start"
                      }}
                    >
                      {/* Icon */}
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          background: n.type === "credit_grant" ? "#EEF2FF" : "#F1F5F9",
                          color: n.type === "credit_grant" ? "#4F46E5" : "#172033",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "15px",
                          flexShrink: 0
                        }}
                      >
                        ⚡
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                          <strong
                            style={{
                              fontSize: "13px",
                              color: "#172033",
                              fontWeight: n.read ? "600" : "700"
                            }}
                          >
                            {n.title}
                          </strong>
                          {!n.read && (
                            <span
                              style={{
                                width: "7px",
                                height: "7px",
                                borderRadius: "50%",
                                background: "#4F46E5",
                                flexShrink: 0
                              }}
                            />
                          )}
                        </div>
                        <p
                          style={{
                            fontSize: "12px",
                            color: "#5B667A",
                            margin: "3px 0 5px",
                            lineHeight: "1.4"
                          }}
                        >
                          {n.message}
                        </p>
                        <span style={{ fontSize: "11px", color: "#8A94A6" }}>
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Dropdown Footer */}
              {notifications.length > 0 && (
                <div
                  style={{
                    padding: "10px 16px",
                    borderTop: "1px solid #EEF2F6",
                    background: "#F8FAFC",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <span style={{ fontSize: "11px", color: "#8A94A6" }}>
                    {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={handleClearAll}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#DC2626",
                      fontSize: "11px",
                      fontWeight: "600",
                      cursor: "pointer",
                      padding: "2px 4px"
                    }}
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="navbar__profile">
          <div className="navbar__avatar" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                referrerPolicy="no-referrer"
              />
            ) : (
              user?.name?.charAt(0)?.toUpperCase() || "U"
            )}
          </div>
          <span className="navbar__username">{user?.name || "User"}</span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
