import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";
import { ShieldCheckIcon, LockIcon, MailIcon, SparklesIcon } from "@animateicons/react/lucide";

const AdminLogin = () => {
  const [email, setEmail] = useState("admin@leadagent.ai");
  const [password, setPassword] = useState("Admin@123456");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAdminAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to log in as administrator.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse at top, var(--accent-light), transparent 70%), var(--bg-primary)",
        padding: "20px"
      }}
    >
      <div
        className="admin-card"
        style={{
          maxWidth: "420px",
          width: "100%",
          padding: "36px 32px",
          boxShadow: "var(--shadow-md)",
          borderColor: "var(--border-primary)"
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #6366F1, #4F46E5)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "var(--shadow-primary)",
              marginBottom: "16px",
              color: "#FFF"
            }}
          >
            <ShieldCheckIcon size={28} color="#FFF" />
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Admin Control Center
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "6px" }}>
            Authenticate with verified administrator credentials
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              color: "var(--danger)",
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              marginBottom: "20px",
              fontWeight: "600"
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Admin Email
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="email"
                required
                className="admin-input"
                style={{ width: "100%", paddingLeft: "36px" }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@leadagent.ai"
              />
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex" }}>
                <MailIcon size={16} />
              </span>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Master Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="password"
                required
                className="admin-input"
                style={{ width: "100%", paddingLeft: "36px" }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex" }}>
                <LockIcon size={16} />
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="admin-btn admin-btn--primary"
            style={{ width: "100%", marginTop: "8px", padding: "11px" }}
          >
            {loading ? "Authenticating..." : "Sign In to Admin Portal"}
          </button>
        </form>

        <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid var(--admin-border-subtle)", textAlign: "center" }}>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <SparklesIcon size={13} color="var(--primary)" />
            Leadsflar Platform v1.0 Enterprise
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
