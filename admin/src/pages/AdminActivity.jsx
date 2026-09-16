import { useState, useEffect } from "react";
import { getAdminLoginLogs } from "../services/api";
import { HistoryIcon, RefreshCwIcon, ShieldCheckIcon } from "@animateicons/react/lucide";

const AdminActivity = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data } = await getAdminLoginLogs();
      setLogs(data.logs || []);
    } catch (err) {
      console.error("Failed to load login logs:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: "800", color: "var(--text-primary)", letterSpacing: "-0.02em", margin: 0 }}>
            Login & Session Audit Trail
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: "4px 0 0" }}>
            Track authenticated user entries, IP footprints, and browser user-agent sessions
          </p>
        </div>

        <button onClick={fetchLogs} className="admin-btn admin-btn--secondary">
          <RefreshCwIcon size={14} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Log Table Container */}
      <div className="admin-table-container">
        <div className="admin-table-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <HistoryIcon size={16} color="var(--accent-primary)" />
            <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>Recent Login Records ({logs.length})</strong>
          </div>
          <span style={{ fontSize: "12px", color: "var(--success)", fontWeight: "600" }}>
            ● Live Audit Logging
          </span>
        </div>

        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ whiteSpace: "nowrap" }}>User</th>
                <th style={{ whiteSpace: "nowrap" }}>Role</th>
                <th style={{ whiteSpace: "nowrap" }}>Status</th>
                <th style={{ whiteSpace: "nowrap" }}>IP Address</th>
                <th style={{ whiteSpace: "nowrap" }}>Device / Client</th>
                <th style={{ whiteSpace: "nowrap" }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    Fetching login records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    No login events recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong style={{ color: "var(--text-primary)", display: "block" }}>{item.userName}</strong>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{item.userEmail}</span>
                    </td>

                    <td>
                      <span className={`badge-pill ${item.userRole === "admin" ? "badge-pill--admin" : "badge-pill--user"}`}>
                        {item.userRole === "admin" && <ShieldCheckIcon size={11} />}
                        {item.userRole}
                      </span>
                    </td>

                    <td>
                      <span className={`badge-pill ${item.userStatus === "suspended" ? "badge-pill--suspended" : "badge-pill--active"}`}>
                        {item.userStatus}
                      </span>
                    </td>

                    <td>
                      <code style={{ background: "var(--bg-tertiary)", padding: "3px 7px", borderRadius: "4px", fontSize: "12px", color: "var(--accent-primary)", border: "1px solid var(--border-color-light)" }}>
                        {item.ip || "127.0.0.1"}
                      </code>
                    </td>

                    <td>
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)", maxWidth: "260px", display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.userAgent}>
                        {item.userAgent || "Web Browser"}
                      </span>
                    </td>

                    <td>
                      <div>
                        <strong style={{ color: "var(--text-primary)", display: "block", fontSize: "12px" }}>
                          {new Date(item.timestamp).toLocaleDateString()}
                        </strong>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminActivity;
