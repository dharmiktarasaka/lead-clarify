import { useNavigate } from "react-router-dom";
import {
  SparklesIcon,
  EyeIcon,
  Trash2Icon,
  GlobeIcon,
  MailIcon,
  PhoneIcon,
  MessageCircleIcon
} from "@animateicons/react/lucide";

const getStatusBadge = (status) => {
  const map = {
    new: { label: "New", className: "badge--info" },
    contacted: { label: "Contacted", className: "badge--warning" },
    replied: { label: "Replied", className: "badge--primary" },
    qualified: { label: "Qualified", className: "badge--success" },
    won: { label: "Won", className: "badge--success" },
    lost: { label: "Lost", className: "badge--danger" }
  };
  return map[status] || { label: status, className: "badge--default" };
};

const getScoreIndicator = (score) => {
  if (score >= 80) return { emoji: "🔥", className: "score--hot", label: "Hot" };
  if (score >= 50) return { emoji: "🟡", className: "score--warm", label: "Warm" };
  return { emoji: "⚪", className: "score--cold", label: "Cold" };
};

const getVerificationIndicator = (verification) => {
  if (!verification || verification.status === "unverified" || !verification.status) {
    return {
      label: "Unverified",
      pillBg: "#F1F5F9",
      textColor: "#64748B",
      borderColor: "#E2E8F0",
      dotColor: "#94A3B8",
      score: verification?.score || 0
    };
  }

  // Conflict warning
  if (verification.warnings && verification.warnings.length > 0 && verification.warnings.some(w => w.includes("conflict") || w.includes("mismatch"))) {
    return {
      label: "Needs Review",
      pillBg: "#FEF3C7",
      textColor: "#B45309",
      borderColor: "#FDE68A",
      dotColor: "#D97706",
      score: verification.score
    };
  }

  if (verification.status === "high_confidence") {
    return {
      label: "High Confidence",
      pillBg: "#DCFCE7",
      textColor: "#15803D",
      borderColor: "#BBF7D0",
      dotColor: "#16A34A",
      score: verification.score
    };
  }

  if (verification.status === "verified") {
    return {
      label: "Verified",
      pillBg: "#EEF2FF",
      textColor: "#4338CA",
      borderColor: "#C7D2FE",
      dotColor: "#4F46E5",
      score: verification.score
    };
  }

  // partially_verified
  return {
    label: "Partial",
    pillBg: "#FEF9C3",
    textColor: "#A16207",
    borderColor: "#FEF08A",
    dotColor: "#CA8A04",
    score: verification.score
  };
};

const LeadTable = ({
  leads,
  onDelete,
  onAnalyze,
  analyzingLeadId = null,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll
}) => {
  const navigate = useNavigate();

  if (!leads || leads.length === 0) {
    return (
      <div className="lead-table__empty">
        <span className="lead-table__empty-icon">📭</span>
        <p>No leads found</p>
        <p className="lead-table__empty-hint">Add your first lead to get started</p>
      </div>
    );
  }

  const allSelected = leads.length > 0 && selectedIds.length === leads.length;

  return (
    <div className="lead-table__wrapper">
      <table className="lead-table">
        <thead>
          <tr>
            {onToggleSelectAll && (
              <th style={{ width: "38px", textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  title={allSelected ? "Deselect All" : "Select All"}
                  style={{ cursor: "pointer", width: "15px", height: "15px" }}
                />
              </th>
            )}
            <th style={{ minWidth: "200px" }}>Company</th>
            <th style={{ minWidth: "160px" }}>Contact</th>
            <th style={{ minWidth: "140px" }}>Phone / WhatsApp</th>
            <th style={{ minWidth: "100px" }}>Industry</th>
            <th style={{ minWidth: "130px" }}>Location</th>
            <th style={{ minWidth: "140px" }}>Verification</th>
            <th style={{ minWidth: "75px" }}>Sales Score</th>
            <th style={{ minWidth: "85px" }}>Status</th>
            <th style={{ textAlign: "right", paddingRight: "16px", minWidth: "120px" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const status = getStatusBadge(lead.status);
            const score = getScoreIndicator(lead.score);
            const isSelected = selectedIds.includes(lead._id);
            const isRowAnalyzing = analyzingLeadId === lead._id;

            // Extract concise location for clean table display
            let conciseLocation = lead.location || "—";
            if (lead.location && lead.location.length > 28) {
              const parts = lead.location.split(",").map(p => p.trim()).filter(Boolean);
              if (parts.length >= 2) {
                conciseLocation = `${parts[parts.length - 2]}, ${parts[parts.length - 1].replace(/\d+/g, "").trim()}`;
              } else {
                conciseLocation = lead.location.substring(0, 26) + "...";
              }
            }

            const cleanPhone = (lead.phone || "").replace(/[^0-9]/g, "");

            return (
              <tr
                key={lead._id}
                className={`lead-table__row ${isSelected ? "lead-table__row--selected" : ""}`}
                onClick={() => navigate(`/leads/${lead._id}`)}
                style={{
                  background: isSelected ? "rgba(79, 70, 229, 0.04)" : undefined,
                  transition: "background 0.15s ease"
                }}
              >
                {onToggleSelect && (
                  <td
                    style={{ textAlign: "center", width: "38px" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(lead._id)}
                      style={{ cursor: "pointer", width: "15px", height: "15px" }}
                    />
                  </td>
                )}

                {/* Company & Website */}
                <td>
                  <div className="lead-table__company">
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span className="lead-table__company-name" title={lead.companyName}>
                        {lead.companyName}
                      </span>
                      {(lead.completenessStatus === "incomplete" || (!lead.email && !lead.phone && !lead.website)) && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "600",
                            padding: "1px 6px",
                            borderRadius: "10px",
                            backgroundColor: "#FEF3C7",
                            color: "#92400E",
                            border: "1px solid #FDE68A",
                            whiteSpace: "nowrap"
                          }}
                          title={
                            lead.missingFields && lead.missingFields.length > 0
                              ? `Needs Enrichment: Missing ${lead.missingFields.join(", ")}`
                              : "Needs Enrichment: Missing contact information"
                          }
                        >
                          Incomplete
                        </span>
                      )}
                    </div>
                    {lead.website && lead.website !== "—" && (
                      <a
                        href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="lead-table__website-link"
                        onClick={(e) => e.stopPropagation()}
                        title={`Visit ${lead.website}`}
                      >
                        <GlobeIcon size={12} />
                        <span>{lead.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span>
                      </a>
                    )}
                  </div>
                </td>

                {/* Contact Person & Email */}
                <td>
                  <div className="lead-table__contact-col">
                    <span className="lead-table__contact-name">
                      {lead.contactName && lead.contactName !== "—" ? lead.contactName : <span style={{ color: "var(--text-muted)", fontWeight: "normal" }}>—</span>}
                    </span>
                    {lead.email && lead.email !== "—" && (
                      <a
                        href={`mailto:${lead.email}`}
                        className="lead-table__contact-email"
                        onClick={(e) => e.stopPropagation()}
                        title={`Email: ${lead.email}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                      >
                        <MailIcon size={12} />
                        <span>{lead.email}</span>
                      </a>
                    )}
                  </div>
                </td>

                {/* Phone & WhatsApp */}
                <td>
                  {lead.phone && lead.phone !== "—" ? (
                    <div className="lead-table__phone-cell">
                      <a
                        href={`tel:${cleanPhone}`}
                        className="lead-table__phone-text"
                        onClick={(e) => e.stopPropagation()}
                        title={`Call ${lead.phone}`}
                        style={{ color: "var(--text-primary)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      >
                        <PhoneIcon size={12} />
                        <span>{lead.phone}</span>
                      </a>
                      <a
                        href={`https://wa.me/${cleanPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="lead-table__wa-badge"
                        onClick={(e) => e.stopPropagation()}
                        title="Chat on WhatsApp"
                      >
                        <MessageCircleIcon size={11} />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>—</span>
                  )}
                </td>

                {/* Industry */}
                <td>
                  <span
                    style={{
                      background: "var(--bg-tertiary)",
                      color: "var(--text-secondary)",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "500",
                      border: "1px solid var(--border-color-light)"
                    }}
                  >
                    {lead.industry || "General"}
                  </span>
                </td>

                {/* Location (with tooltip for full address) */}
                <td>
                  <div
                    className="lead-table__location"
                    title={lead.location || "Location not specified"}
                  >
                    {conciseLocation}
                  </div>
                </td>

                {/* Verification Intelligence */}
                <td>
                  {(() => {
                    const verif = getVerificationIndicator(lead.verification);
                    return (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          backgroundColor: verif.pillBg,
                          border: `1px solid ${verif.borderColor}`,
                          fontSize: "11px",
                          fontWeight: "600",
                          color: verif.textColor,
                          whiteSpace: "nowrap"
                        }}
                        title={
                          lead.verification?.warnings && lead.verification.warnings.length > 0
                            ? `⚠️ Warnings:\n${lead.verification.warnings.join("\n")}`
                            : `Verification Score: ${verif.score}/100 (${verif.label})`
                        }
                      >
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            backgroundColor: verif.dotColor
                          }}
                        />
                        <span>{verif.score > 0 ? `${verif.score}% ` : ""}{verif.label}</span>
                      </div>
                    );
                  })()}
                </td>

                {/* Score */}
                <td>
                  <span
                    className={`lead-table__score ${score.className}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAnalyze?.(lead);
                    }}
                    style={{ cursor: "pointer", fontSize: "12px", padding: "3px 8px" }}
                    title="Click to view AI Intelligence Report"
                  >
                    {score.emoji} {lead.score}
                  </span>
                </td>

                {/* Status */}
                <td>
                  <span className={`badge ${status.className}`} style={{ fontSize: "11px", padding: "3px 8px" }}>
                    {status.label}
                  </span>
                </td>

                {/* Actions */}
                <td>
                  <div className="lead-table__actions" style={{ justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
                    <button
                      className={`btn btn--sm ${lead.aiAnalysis ? "btn--primary" : "btn--ghost"}`}
                      title={lead.aiAnalysis ? "View AI Intelligence Report" : "Analyze Lead with Gemini AI (Costs 98 credits)"}
                      onClick={() => onAnalyze?.(lead)}
                      disabled={isRowAnalyzing}
                      style={{
                        padding: "4px 9px",
                        fontSize: "11.5px",
                        fontWeight: "600",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        background: lead.aiAnalysis
                          ? "linear-gradient(135deg, #4F46E5, #7C3AED)"
                          : "rgba(79, 70, 229, 0.08)",
                        color: lead.aiAnalysis ? "#FFFFFF" : "var(--accent-primary)",
                        borderColor: "rgba(79, 70, 229, 0.3)"
                      }}
                    >
                      <SparklesIcon size={12} />
                      <span>{isRowAnalyzing ? "..." : lead.aiAnalysis ? "Insights" : "AI (98 cr)"}</span>
                    </button>
                    <button
                      className="btn btn--sm btn--ghost"
                      title="View Details"
                      onClick={() => navigate(`/leads/${lead._id}`)}
                      style={{ padding: "5px 7px", display: "inline-flex", alignItems: "center" }}
                    >
                      <EyeIcon size={14} />
                    </button>
                    <button
                      className="btn btn--sm btn--ghost btn--danger"
                      title="Delete this lead"
                      onClick={() => onDelete?.(lead._id, lead.companyName)}
                      style={{ padding: "5px 7px", display: "inline-flex", alignItems: "center" }}
                    >
                      <Trash2Icon size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default LeadTable;
