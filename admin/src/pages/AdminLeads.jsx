import { useState, useEffect } from "react";
import { getAdminGlobalLeads } from "../services/api";
import {
  GlobeIcon,
  SearchIcon,
  FlameIcon,
  StarIcon,
  PhoneIcon,
  MailIcon,
  MapPinIcon,
  RefreshCwIcon
} from "@animateicons/react/lucide";

const AdminLeads = () => {
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [minScore, setMinScore] = useState("");

  useEffect(() => {
    fetchLeads(1);
  }, [search, statusFilter, minScore]);

  const fetchLeads = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (minScore) params.minScore = minScore;

      const { data } = await getAdminGlobalLeads(params);
      setLeads(data.leads);
      setPagination(data.pagination);
    } catch (err) {
      console.error("Failed to fetch global leads:", err);
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
            Global Leads Master View
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: "4px 0 0" }}>
            Supervise all business opportunities generated across customer workspaces
          </p>
        </div>

        <button
          onClick={() => fetchLeads(pagination.page)}
          className="admin-btn admin-btn--secondary"
        >
          <RefreshCwIcon size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters */}
      <div className="admin-card" style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 260px", maxWidth: "420px" }}>
            <input
              type="text"
              className="admin-input"
              style={{ width: "100%", paddingLeft: "36px", paddingRight: search ? "32px" : "12px" }}
              placeholder="Search company, contact, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex", pointerEvents: "none" }}>
              <SearchIcon size={15} />
            </span>
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", padding: "2px" }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <select
              className="admin-input"
              style={{ width: "auto", cursor: "pointer" }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="replied">Replied</option>
              <option value="qualified">Qualified</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>

            <select
              className="admin-input"
              style={{ width: "auto", cursor: "pointer" }}
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
            >
              <option value="">All Scores</option>
              <option value="80">Hot Leads (80+)</option>
              <option value="50">Warm Leads (50+)</option>
            </select>

            {(search || statusFilter || minScore) && (
              <button
                onClick={() => { setSearch(""); setStatusFilter(""); setMinScore(""); }}
                className="admin-btn admin-btn--secondary admin-btn--sm"
                title="Reset filters"
              >
                ✕ Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Global Leads Table */}
      <div className="admin-table-container">
        <div className="admin-table-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <GlobeIcon size={16} color="var(--warning)" />
            <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>All Leads ({pagination.total})</strong>
          </div>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Showing page {pagination.page} of {pagination.pages || 1}
          </span>
        </div>

        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ whiteSpace: "nowrap" }}>Company</th>
                <th style={{ whiteSpace: "nowrap" }}>Owner (User)</th>
                <th style={{ whiteSpace: "nowrap" }}>Contact Info</th>
                <th style={{ whiteSpace: "nowrap" }}>Location</th>
                <th style={{ whiteSpace: "nowrap" }}>Score</th>
                <th style={{ whiteSpace: "nowrap" }}>Status</th>
                <th style={{ whiteSpace: "nowrap" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    Loading global leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    No leads found.
                  </td>
                </tr>
              ) : (
                leads.map((ld) => (
                  <tr key={ld._id}>
                    <td>
                      <strong style={{ color: "var(--text-primary)", display: "block" }}>{ld.companyName}</strong>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {ld.contactName || "Decision Maker"} • {ld.industry || "General"}
                      </span>
                    </td>

                    <td>
                      {ld.owner ? (
                        <div>
                          <strong style={{ display: "block", color: "var(--text-primary)", fontSize: "12px" }}>
                            {ld.owner.name}
                          </strong>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{ld.owner.email}</span>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Unassigned</span>
                      )}
                    </td>

                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "12px" }}>
                        {ld.phone && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--success)" }}>
                            <PhoneIcon size={11} /> {ld.phone}
                          </span>
                        )}
                        {ld.email && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--info)" }}>
                            <MailIcon size={11} /> {ld.email}
                          </span>
                        )}
                        {!ld.phone && !ld.email && (
                          <span style={{ color: "var(--text-muted)" }}>No direct contacts</span>
                        )}
                      </div>
                    </td>

                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--text-secondary)" }}>
                        <MapPinIcon size={12} /> {ld.location || "N/A"}
                      </span>
                    </td>

                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontWeight: "700",
                          fontSize: "12px",
                          color: ld.score >= 80 ? "var(--danger)" : ld.score >= 50 ? "var(--warning)" : "var(--text-muted)"
                        }}
                      >
                        {ld.score >= 80 ? <FlameIcon size={13} color="var(--danger)" /> : <StarIcon size={13} color="var(--warning)" />}
                        {ld.score || 0}
                      </span>
                    </td>

                    <td>
                      <span className="badge-pill badge-pill--user">
                        {ld.status}
                      </span>
                    </td>

                    <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                      {new Date(ld.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div style={{ padding: "16px 20px", display: "flex", justifyContent: "flex-end", gap: "8px", borderTop: "1px solid var(--border-primary)" }}>
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchLeads(pagination.page - 1)}
              className="admin-btn admin-btn--secondary admin-btn--sm"
            >
              Previous
            </button>
            <span style={{ display: "flex", alignItems: "center", padding: "0 10px", fontSize: "12px", color: "var(--text-secondary)" }}>
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchLeads(pagination.page + 1)}
              className="admin-btn admin-btn--secondary admin-btn--sm"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLeads;
