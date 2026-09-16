import { useAdminAuth } from "../context/AdminAuthContext";
import { MenuIcon, ShieldCheckIcon } from "@animateicons/react/lucide";

const AdminNavbar = ({ onToggleSidebar }) => {
  const { admin } = useAdminAuth();

  return (
    <header className="admin-navbar">
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <button
          onClick={onToggleSidebar}
          className="admin-btn admin-btn--secondary"
          style={{ padding: "8px", display: "flex", alignItems: "center" }}
          title="Toggle Navigation"
        >
          <MenuIcon size={18} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              background: "#F0FDF4",
              color: "var(--success)",
              border: "1px solid #BBF7D0",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: "700"
            }}
          >
            <span className="pulse-dot" style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--success)" }}></span>
            SYSTEM OPERATIONAL
          </span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
              color: "#FFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: "800"
            }}
          >
            {admin?.name?.charAt(0)?.toUpperCase() || "A"}
          </div>
          <div style={{ lineHeight: "1.2" }}>
            <span style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>
              {admin?.name || "Admin"}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--accent-primary)", fontWeight: "600" }}>
              <ShieldCheckIcon size={11} color="var(--accent-primary)" /> Super Admin
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminNavbar;
