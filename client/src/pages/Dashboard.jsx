import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getLeads } from "../services/api";
import StatCard from "../components/StatCard";
import LeadTable from "../components/LeadTable";
import AnimatedEmoji from "../components/AnimatedEmoji";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data } = await getLeads({ sortBy: "createdAt", order: "desc" });
      setLeads(data.leads);
      setCounts(data.counts);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span>{getGreeting()}</span>
            <AnimatedEmoji emoji="👋" size={30} />
          </h1>
          <p className="page-header__subtitle">
            Welcome back, <strong>{user?.name}</strong>. Here's your lead overview.
          </p>
        </div>
        <button
          className="btn btn--primary"
          onClick={() => navigate("/leads")}
        >
          + Add Lead
        </button>
      </div>

      <div className="stat-grid">
        <StatCard
          icon="👥"
          label="Total Leads"
          value={counts.total || 0}
          color="blue"
        />
        <StatCard
          icon="🔥"
          label="Hot Prospects"
          value={counts.hot || 0}
          color="red"
        />
        <StatCard
          icon="🛡️"
          label="High Confidence"
          value={counts.highConfidence || 0}
          color="indigo"
        />
        <StatCard
          icon="✅"
          label="Verified Trust"
          value={counts.verified || 0}
          color="green"
        />
        <StatCard
          icon="⚠️"
          label="Needs Review"
          value={counts.needsReview || 0}
          color="yellow"
        />
        <StatCard
          icon="🏆"
          label="Won Leads"
          value={counts.won || 0}
          color="emerald"
        />
      </div>

      <div className="dashboard__section">
        <div className="section-header">
          <h2>Recent Leads</h2>
          <button
            className="btn btn--ghost"
            onClick={() => navigate("/leads")}
          >
            View all →
          </button>
        </div>
        <LeadTable leads={leads.slice(0, 8)} />
      </div>
    </div>
  );
};

export default Dashboard;
