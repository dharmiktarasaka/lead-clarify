import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const Settings = () => {
  const { user, logout } = useAuth();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="page-header__subtitle">Manage your account</p>
        </div>
      </div>

      <div className="settings-grid">
        <div className="detail-card">
          <h3>👤 Profile</h3>
          <div className="detail-card__fields">
            <div className="detail-field">
              <span className="detail-field__label">Name</span>
              <span className="detail-field__value">{user?.name || "—"}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field__label">Email</span>
              <span className="detail-field__value">{user?.email || "—"}</span>
            </div>
          </div>
        </div>

        <div className="detail-card">
          <h3>🔒 Security</h3>
          <p className="detail-card__text">Password management coming soon.</p>
          <button className="btn btn--ghost" disabled>
            Change Password
          </button>
        </div>

        <div className="detail-card">
          <h3>🤖 AI Configuration</h3>
          <p className="detail-card__text">
            AI provider configuration will be available in Phase 3.
          </p>
          <button className="btn btn--ghost" disabled>
            Configure AI
          </button>
        </div>

        <div className="detail-card detail-card--danger">
          <h3>⚠️ Danger Zone</h3>
          <p className="detail-card__text">
            Log out from your account on this device.
          </p>
          <button className="btn btn--danger" onClick={logout}>
            🚪 Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
