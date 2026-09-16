import { useAuth } from "../context/AuthContext";
import { MenuIcon, BellIcon } from "@animateicons/react/lucide";

const Navbar = ({ onMenuToggle }) => {
  const { user } = useAuth();

  return (
    <header className="navbar">
      <button className="navbar__menu-btn" onClick={onMenuToggle} title="Toggle navigation">
        <MenuIcon size={20} />
      </button>

      <div className="navbar__spacer"></div>

      <div className="navbar__actions" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Daily Refill Credits Counter */}
        <div
          className="navbar__credits"
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
            cursor: "default"
          }}
          title="Daily Free Credits: Automatically refills back to 1,000 free credits every single day!"
        >
          <span style={{ fontSize: "14px" }}>⚡</span>
          <span>{user?.credits !== undefined ? user.credits.toLocaleString() : "1,000"}</span>
          <span style={{ fontSize: "11px", fontWeight: "600", opacity: 0.75 }}>Credits</span>
        </div>

        <button className="navbar__notification" title="Notifications" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <BellIcon size={18} />
          <span className="navbar__badge">3</span>
        </button>

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
