import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  SparklesIcon,
  LayoutDashboardIcon,
  UsersIcon,
  FolderXIcon,
  SettingsIcon,
  LogOutIcon
} from "@animateicons/react/lucide";
import { getScrapFolders } from "../services/api";

const Sidebar = ({ isOpen, onToggle }) => {
  const { logout } = useAuth();
  const [scrapCount, setScrapCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchCounts = async () => {
      try {
        const { data } = await getScrapFolders();
        if (isMounted) {
          setScrapCount(data.totalActiveScraps || 0);
        }
      } catch (err) {
        // Silently fail if not logged in or network error
      }
    };
    fetchCounts();

    // Event listener for scraps updates triggered by uploads or recoveries
    const handleScrapUpdate = () => fetchCounts();
    window.addEventListener("scrapsUpdated", handleScrapUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("scrapsUpdated", handleScrapUpdate);
    };
  }, []);

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: <LayoutDashboardIcon size={18} /> },
    { path: "/leads", label: "Leads", icon: <UsersIcon size={18} /> },
    {
      path: "/scraps",
      label: "Scraps",
      icon: <FolderXIcon size={18} />,
      badge: scrapCount > 0 ? scrapCount : null
    },
    { path: "/settings", label: "Settings", icon: <SettingsIcon size={18} /> }
  ];

  return (
    <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
      <div className="sidebar__brand">
        <span className="sidebar__logo" style={{ display: "inline-flex", alignItems: "center" }}>
          <SparklesIcon size={22} color="var(--accent-primary)" />
        </span>
        <span className="sidebar__title">AI Lead Agent</span>
      </div>

      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? "sidebar__link--active" : ""}`
            }
            onClick={() => window.innerWidth < 768 && onToggle?.()}
          >
            <span className="sidebar__icon" style={{ display: "inline-flex", alignItems: "center" }}>
              {item.icon}
            </span>
            <span className="sidebar__label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1 }}>
              <span>{item.label}</span>
              {item.badge && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    background: "#FEE2E2",
                    color: "#DC2626",
                    padding: "1px 7px",
                    borderRadius: "10px"
                  }}
                >
                  {item.badge}
                </span>
              )}
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        <button className="sidebar__logout" onClick={logout} style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
          <span className="sidebar__icon" style={{ display: "inline-flex", alignItems: "center" }}>
            <LogOutIcon size={18} />
          </span>
          <span className="sidebar__label">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
