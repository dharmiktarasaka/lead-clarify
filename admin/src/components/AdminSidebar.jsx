import { NavLink } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";
import logoImg from "../assets/logo.png";
import {
  LayoutDashboardIcon,
  UsersIcon,
  GlobeIcon,
  HistoryIcon,
  LogOutIcon,
  ShieldCheckIcon,
  SparklesIcon
} from "@animateicons/react/lucide";

const AdminSidebar = ({ isOpen, onClose }) => {
  const { logout } = useAdminAuth();

  const navItems = [
    { path: "/", label: "Dashboard", icon: <LayoutDashboardIcon size={18} /> },
    { path: "/users", label: "User Management", icon: <UsersIcon size={18} /> },
    { path: "/leads", label: "Global Leads", icon: <GlobeIcon size={18} /> },
    { path: "/activity", label: "Login & Audit Logs", icon: <HistoryIcon size={18} /> },
    { path: "/gemini-live", label: "Gemini AI Live Lab", icon: <SparklesIcon size={18} /> }
  ];

  return (
    <aside className={`admin-sidebar ${isOpen ? "admin-sidebar--open" : ""}`}>
      {/* Brand Header */}
      <div
        style={{
          padding: "24px 20px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          borderBottom: "1px solid var(--border-primary)"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <img
            src={logoImg}
            alt="Leadsflar"
            style={{
              height: "40px",
              maxWidth: "170px",
              width: "auto",
              objectFit: "contain",
              display: "block"
            }}
          />
          <span
            style={{
              fontSize: "10px",
              fontWeight: "700",
              color: "#4F46E5",
              background: "#EEF2FF",
              padding: "2px 8px",
              borderRadius: "6px",
              display: "inline-block",
              width: "fit-content",
              textTransform: "uppercase",
              letterSpacing: "0.06em"
            }}
          >
            Admin HQ
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ padding: "20px 14px", display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            onClick={onClose}
            className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`}
          >
            <span style={{ display: "inline-flex", alignItems: "center" }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer Profile & Logout */}
      <div style={{ padding: "16px", borderTop: "1px solid var(--border-primary)" }}>
        <button
          onClick={logout}
          className="admin-btn admin-btn--danger"
          style={{ width: "100%", justifyContent: "center", gap: "8px", padding: "9px 14px", fontWeight: "600", fontSize: "13px" }}
        >
          <LogOutIcon size={15} color="var(--danger)" />
          <span>Exit Admin Portal</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
