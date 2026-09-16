import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAdminStats } from "../services/api";
import {
  UsersIcon,
  GlobeIcon,
  SparklesIcon,
  HistoryIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  FlameIcon,
  StarIcon,
  ArrowRightIcon,
  CheckIcon
} from "@animateicons/react/lucide";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      const { data } = await getAdminStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to load admin stats:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
        <p>Loading real-time platform metrics...</p>
      </div>
    );
  }

  const users = stats?.users || {};
  const leads = stats?.leads || {};
  const recentUsers = stats?.recentActiveUsers || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: "800", color: "var(--text-primary)", letterSpacing: "-0.02em", margin: 0 }}>
            Platform Overview
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "4px", margin: 0 }}>
            Real-time telemetry, user session tracking, and global lead distribution
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={fetchStats}
            disabled={refreshing}
            className="admin-btn admin-btn--secondary"
            title="Refresh statistics"
          >
            <RefreshCwIcon size={14} />
            <span>{refreshing ? "Updating..." : "Refresh Telemetry"}</span>
          </button>
          <Link to="/users" className="admin-btn admin-btn--primary">
            <UsersIcon size={14} />
            <span>Manage Users</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="admin-stats-grid">
        {/* Total Registered Users */}
        <div className="admin-card stat-metric admin-card--hover">
          <div className="stat-metric__header">
            <span className="stat-metric__label">TOTAL REGISTERED USERS</span>
            <div className="stat-metric__icon" style={{ background: "var(--accent-light)", color: "var(--accent-primary)" }}>
              <UsersIcon size={20} color="var(--accent-primary)" />
            </div>
          </div>
          <div className="stat-metric__val">{users.total || 0}</div>
          <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--success)", fontWeight: "600" }}>✓ {users.active || 0} Active</span>
            <span>•</span>
            <span style={{ color: "var(--danger)", fontWeight: "600" }}>{users.suspended || 0} Suspended</span>
          </div>
        </div>

        {/* Logged In Today */}
        <div className="admin-card stat-metric admin-card--hover">
          <div className="stat-metric__header">
            <span className="stat-metric__label">USERS ACTIVE TODAY</span>
            <div className="stat-metric__icon" style={{ background: "#F0FDF4", color: "var(--success)" }}>
              <HistoryIcon size={20} color="var(--success)" />
            </div>
          </div>
          <div className="stat-metric__val">{users.loginsToday || 0}</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--accent-primary)", fontWeight: "600" }}>{users.loginsWeek || 0}</span> active this past week
          </div>
        </div>

        {/* Total Platform Logins */}
        <div className="admin-card stat-metric admin-card--hover">
          <div className="stat-metric__header">
            <span className="stat-metric__label">TOTAL PLATFORM LOGINS</span>
            <div className="stat-metric__icon" style={{ background: "#F0F9FF", color: "var(--info)" }}>
              <ShieldCheckIcon size={20} color="var(--info)" />
            </div>
          </div>
          <div className="stat-metric__val">{users.totalPlatformLogins || 0}</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Across all {users.total || 0} accounts
          </div>
        </div>

        {/* Total Leads Managed */}
        <div className="admin-card stat-metric admin-card--hover">
          <div className="stat-metric__header">
            <span className="stat-metric__label">TOTAL SYSTEM LEADS</span>
            <div className="stat-metric__icon" style={{ background: "#FFFBEB", color: "var(--warning)" }}>
              <GlobeIcon size={20} color="var(--warning)" />
            </div>
          </div>
          <div className="stat-metric__val">{leads.total || 0}</div>
          <div style={{ display: "flex", gap: "10px", fontSize: "12px", color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--danger)", fontWeight: "600" }}>🔥 {leads.hot || 0} Hot</span>
            <span>•</span>
            <span style={{ color: "var(--info)", fontWeight: "600" }}>⚡ {leads.aiAnalyzed || 0} AI Analyzed</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Logins & System Intelligence */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
        {/* Recent Active Users / Logins */}
        <div className="admin-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                Recent User Logins
              </h3>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "4px 0 0" }}>
                Latest user sessions detected across the application
              </p>
            </div>
            <Link to="/activity" className="admin-btn admin-btn--secondary admin-btn--sm">
              <span>View All Logs</span>
              <ArrowRightIcon size={12} />
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {recentUsers.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--text-muted)", padding: "16px 0", textAlign: "center" }}>
                No recent logins recorded.
              </p>
            ) : (
              recentUsers.map((u) => (
                <div
                  key={u._id}
                  style={{
                    padding: "12px 14px",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-color-light)",
                    borderRadius: "var(--radius-sm)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "var(--accent-light)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                        fontWeight: "700",
                        color: "var(--accent-primary)"
                      }}
                    >
                      {u.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)", display: "block" }}>
                        {u.name}
                      </span>
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                        {u.email}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        color: "var(--accent-primary)",
                        background: "var(--accent-light)",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        display: "inline-block",
                        marginBottom: "3px"
                      }}
                    >
                      {u.loginCount || 1} logins
                    </span>
                    <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)" }}>
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lead Quality & AI Intelligence Breakdown */}
        <div className="admin-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                Platform Data Health
              </h3>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "4px 0 0" }}>
                Enrichment completeness and AI scoring across all customer accounts
              </p>
            </div>
            <Link to="/leads" className="admin-btn admin-btn--secondary admin-btn--sm">
              <span>View Global Leads</span>
              <ArrowRightIcon size={12} />
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Hot Leads Progress */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                <span style={{ color: "var(--danger)", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                  <FlameIcon size={14} color="var(--danger)" /> Hot Leads (Score ≥ 80)
                </span>
                <span style={{ color: "var(--text-primary)", fontWeight: "700" }}>{leads.hot || 0}</span>
              </div>
              <div style={{ height: "8px", background: "var(--bg-tertiary)", borderRadius: "4px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${leads.total ? Math.round((leads.hot / leads.total) * 100) : 0}%`,
                    background: "linear-gradient(90deg, #EF4444, #F87171)",
                    borderRadius: "4px"
                  }}
                ></div>
              </div>
            </div>

            {/* Warm Leads Progress */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                <span style={{ color: "var(--warning)", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                  <StarIcon size={14} color="var(--warning)" /> Warm Leads (Score 50-79)
                </span>
                <span style={{ color: "var(--text-primary)", fontWeight: "700" }}>{leads.warm || 0}</span>
              </div>
              <div style={{ height: "8px", background: "var(--bg-tertiary)", borderRadius: "4px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${leads.total ? Math.round((leads.warm / leads.total) * 100) : 0}%`,
                    background: "linear-gradient(90deg, #D97706, #F59E0B)",
                    borderRadius: "4px"
                  }}
                ></div>
              </div>
            </div>

            {/* AI Enriched Contacts Progress */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                <span style={{ color: "var(--success)", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                  <CheckIcon size={14} color="var(--success)" /> Contacts with Real Phone & Email
                </span>
                <span style={{ color: "var(--text-primary)", fontWeight: "700" }}>{leads.enriched || 0}</span>
              </div>
              <div style={{ height: "8px", background: "var(--bg-tertiary)", borderRadius: "4px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${leads.total ? Math.round((leads.enriched / leads.total) * 100) : 0}%`,
                    background: "linear-gradient(90deg, #10B981, #16A34A)",
                    borderRadius: "4px"
                  }}
                ></div>
              </div>
            </div>

            {/* AI Analyzed Leads Progress */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                <span style={{ color: "var(--accent-primary)", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                  <SparklesIcon size={14} color="var(--accent-primary)" /> Deep Gemini AI Audited
                </span>
                <span style={{ color: "var(--text-primary)", fontWeight: "700" }}>{leads.aiAnalyzed || 0}</span>
              </div>
              <div style={{ height: "8px", background: "var(--bg-tertiary)", borderRadius: "4px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${leads.total ? Math.round((leads.aiAnalyzed / leads.total) * 100) : 0}%`,
                    background: "linear-gradient(90deg, #4F46E5, #6366F1)",
                    borderRadius: "4px"
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
