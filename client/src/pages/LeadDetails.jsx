import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getLeadById,
  updateLead,
  deleteLead as deleteLeadApi,
  analyzeLead,
  enrichLead,
  verifyLead,
  applyLeadEvidence
} from "../services/api";
import AiIntelligenceModal from "../components/AiIntelligenceModal";
import {
  ArrowLeftIcon,
  PencilIcon,
  Trash2Icon,
  SparklesIcon,
  GlobeIcon,
  MailIcon,
  PhoneIcon,
  MessageCircleIcon,
  CopyIcon,
  CheckIcon,
  UserIcon,
  MapPinIcon,
  SaveIcon,
  TriangleAlertIcon,
  ShieldCheckIcon,
  InfoIcon
} from "@animateicons/react/lucide";
import AnimatedEmoji, { EmojiReactionBar } from "../components/AnimatedEmoji";

const statusOptions = ["new", "contacted", "replied", "qualified", "won", "lost"];

const getScoreIndicator = (score) => {
  if (score >= 80) return { emoji: "🔥", label: "Hot", className: "score--hot" };
  if (score >= 50) return { emoji: "🟡", label: "Warm", className: "score--warm" };
  return { emoji: "⚪", label: "Cold", className: "score--cold" };
};

const getVerificationBadge = (verification) => {
  const status = verification?.status || "unverified";
  const score = verification?.score || 0;

  switch (status) {
    case "high_confidence":
      return {
        label: "High Confidence",
        score,
        emoji: "🛡️",
        bg: "rgba(22, 163, 74, 0.1)",
        color: "#15803D",
        border: "rgba(22, 163, 74, 0.3)"
      };
    case "verified":
      return {
        label: "Verified",
        score,
        emoji: "✅",
        bg: "rgba(22, 163, 74, 0.08)",
        color: "#16A34A",
        border: "rgba(22, 163, 74, 0.25)"
      };
    case "partially_verified":
      return {
        label: "Partially Verified",
        score,
        emoji: "⚡",
        bg: "rgba(2, 132, 199, 0.08)",
        color: "#0284C7",
        border: "rgba(2, 132, 199, 0.25)"
      };
    case "needs_review":
      return {
        label: "Needs Review",
        score,
        emoji: "⚠️",
        bg: "rgba(217, 119, 6, 0.1)",
        color: "#D97706",
        border: "rgba(217, 119, 6, 0.3)"
      };
    default:
      return {
        label: "Unverified",
        score,
        emoji: "⚪",
        bg: "rgba(100, 116, 139, 0.08)",
        color: "#64748B",
        border: "rgba(100, 116, 139, 0.2)"
      };
  }
};

const LeadDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [showAiModal, setShowAiModal] = useState(false);

  useEffect(() => {
    fetchLead();
  }, [id]);

  const fetchLead = async () => {
    try {
      const { data } = await getLeadById(id);
      setLead(data.lead);
      setEditData(data.lead);
    } catch (err) {
      setError("Lead not found");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await updateLead(id, editData);
      setLead(data.lead);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update lead");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteLeadApi(id);
      navigate("/leads");
    } catch (err) {
      setError("Failed to delete lead");
    }
  };

  const handleInputChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleRunAI = async () => {
    setAnalyzing(true);
    setError("");
    try {
      const { data } = await analyzeLead(id);
      setLead(data.lead);
      setEditData(data.lead);
      setShowAiModal(true);
    } catch (err) {
      setError("AI Error: " + (err.response?.data?.message || err.message));
    } finally {
      setAnalyzing(false);
    }
  };

  const [enriching, setEnriching] = useState(false);
  const [enrichNotice, setEnrichNotice] = useState(null); // { type, text }

  const handleEnrichLead = async () => {
    setEnriching(true);
    setError("");
    setEnrichNotice(null);
    try {
      const { data } = await enrichLead(id);
      setLead(data.lead);
      setEditData(data.lead);
      if (data.hasNewData === false) {
        setEnrichNotice({
          type: "warning",
          text: data.message || "No new contact details could be found online. No credits were deducted."
        });
      } else {
        setEnrichNotice({
          type: "success",
          text: data.message || "Real contact details found and saved! (-98 credits)"
        });
      }
      setTimeout(() => setEnrichNotice(null), 4500);
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      const status = err.response?.status;
      if (status === 400 && err.response?.data?.alreadyComplete) {
        // All details already present — show as info, not an error
        setEnrichNotice({
          type: "success",
          text: msg
        });
        setTimeout(() => setEnrichNotice(null), 4500);
      } else {
        setError(status === 402 ? msg : "Web Search Error: " + msg);
      }
    } finally {
      setEnriching(false);
    }
  };

  const [verifying, setVerifying] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState(null);

  const handleVerifyLead = async (force = false) => {
    setVerifying(true);
    setVerifyNotice(null);
    try {
      const { data } = await verifyLead(id, force);
      setLead(data.lead);
      setEditData(data.lead);
      setVerifyNotice({
        type: "success",
        text: `Verification completed: ${data.verification.score}/100 (${data.verification.status.replace("_", " ")})`
      });
      setTimeout(() => setVerifyNotice(null), 4000);
    } catch (err) {
      setVerifyNotice({
        type: "warning",
        text: "Verification Error: " + (err.response?.data?.message || err.message)
      });
      setTimeout(() => setVerifyNotice(null), 5000);
    } finally {
      setVerifying(false);
    }
  };

  const handleApplyEvidence = async (field, value) => {
    try {
      const { data } = await applyLeadEvidence(id, { field, value });
      setLead(data.lead);
      setEditData(data.lead);
      setVerifyNotice({
        type: "success",
        text: `Updated ${field} with verified evidence value!`
      });
      setTimeout(() => setVerifyNotice(null), 3000);
    } catch (err) {
      setVerifyNotice({
        type: "warning",
        text: "Failed to apply evidence: " + (err.response?.data?.message || err.message)
      });
    }
  };

  const handleCopy = () => {
    if (lead?.aiMessage) {
      navigator.clipboard.writeText(lead.aiMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Loading lead...</p>
      </div>
    );
  }

  if (error && !lead) {
    return (
      <div className="page-error">
        <h2>😕 {error}</h2>
        <button className="btn btn--primary" onClick={() => navigate("/leads")}>
          Back to Leads
        </button>
      </div>
    );
  }

  const score = getScoreIndicator(lead.score);
  const vBadge = getVerificationBadge(lead.verification);

  return (
    <div className="lead-details">
      <div className="page-header">
        <div>
          <button className="btn btn--ghost btn--sm" onClick={() => navigate("/leads")} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <ArrowLeftIcon size={14} />
            <span>Back to Leads</span>
          </button>
          <h1 style={{ marginTop: "8px" }}>{lead.companyName}</h1>
          <div className="lead-details__meta" style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <span className={`badge badge--lg ${lead.status === "won" ? "badge--success" : lead.status === "lost" ? "badge--danger" : "badge--info"}`}>
              {lead.status.toUpperCase()}
            </span>
            <span className={`lead-details__score ${score.className}`} title="Sales Priority Score (AI Propensity)" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <AnimatedEmoji emoji={score.emoji} size={18} />
              <span>Sales Score: {lead.score} ({score.label})</span>
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                fontWeight: "700",
                padding: "4px 10px",
                borderRadius: "14px",
                background: vBadge.bg,
                color: vBadge.color,
                border: `1px solid ${vBadge.border}`
              }}
              title="Factual Verification Trust Score (Multi-source corroborated)"
            >
              <AnimatedEmoji emoji={vBadge.emoji} size={16} />
              <span>Trust Score: {vBadge.score}/100 ({vBadge.label})</span>
            </span>
            {/* Interactive Emoji Reaction Bar (😍 ❤️ 😂 🔥 👋) */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
              <EmojiReactionBar />
            </div>
          </div>
        </div>
        <div className="page-header__actions">
          {!editing ? (
            <>
              <button className="btn btn--ghost" onClick={() => setEditing(true)} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <PencilIcon size={14} />
                <span>Edit</span>
              </button>
              <button className="btn btn--danger" onClick={handleDelete} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Trash2Icon size={14} />
                <span>Delete</span>
              </button>
            </>
          ) : (
            <>
              <button className="btn btn--ghost" onClick={() => { setEditing(false); setEditData(lead); }}>
                Cancel
              </button>
              <button className="btn btn--primary" onClick={handleSave} disabled={saving} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <SaveIcon size={14} />
                <span>{saving ? "Saving..." : "Save"}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="alert alert--danger">{error}</div>}

      {enrichNotice && (
        <div
          className={`alert ${enrichNotice.type === "warning" ? "alert--warning" : "alert--success"}`}
          style={{ marginBottom: "16px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}
        >
          {enrichNotice.type === "warning" ? (
            <TriangleAlertIcon size={16} color="#D97706" />
          ) : (
            <CheckIcon size={16} color="#16A34A" />
          )}
          <span>{enrichNotice.text}</span>
        </div>
      )}

      {verifyNotice && (
        <div
          className={`alert ${verifyNotice.type === "warning" ? "alert--warning" : "alert--success"}`}
          style={{ marginBottom: "16px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}
        >
          {verifyNotice.type === "warning" ? (
            <TriangleAlertIcon size={16} color="#D97706" />
          ) : (
            <ShieldCheckIcon size={16} color="#16A34A" />
          )}
          <span>{verifyNotice.text}</span>
        </div>
      )}

      <div className="lead-details__grid">
        {/* Contact Information */}
        <div className="detail-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
            <h3 style={{ margin: 0 }}>Contact Information</h3>
          {(() => {
              const isFilled = (v) => Boolean(v && typeof v === "string" && v.trim() !== "" && v !== "—" && v !== "N/A");
              const allDetailsFilled = isFilled(lead?.contactName) && isFilled(lead?.email) && isFilled(lead?.phone) && isFilled(lead?.website);

              return allDetailsFilled ? (
                <span
                  style={{
                    fontSize: "12px",
                    padding: "4px 10px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    background: "rgba(22, 163, 74, 0.1)",
                    color: "#16A34A",
                    borderRadius: "6px",
                    border: "1px solid rgba(22, 163, 74, 0.3)",
                    fontWeight: "600"
                  }}
                  title="All contact details are already present — no credits needed"
                >
                  <CheckIcon size={14} />
                  <span>All Details Found</span>
                </span>
              ) : (
                <button
                  type="button"
                  className="btn btn--sm btn--primary"
                  onClick={handleEnrichLead}
                  disabled={enriching}
                  style={{
                    background: "linear-gradient(135deg, #0284C7, #4F46E5)",
                    boxShadow: "0 2px 8px rgba(2, 132, 199, 0.25)",
                    fontSize: "12px",
                    padding: "4px 10px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px"
                  }}
                  title="Search Google Maps & Live Web to extract real phone, website, and email (Costs 98 credits from your 1,000 daily credits)"
                >
                  <GlobeIcon size={14} />
                  <span>{enriching ? "Searching Web & Google..." : "Auto-Find Details (AI Web) (98 cr)"}</span>
                </button>
              );
            })()}
          </div>

          <div className="detail-card__fields">
            {[
              { key: "contactName", label: "Contact Name", icon: <UserIcon size={14} /> },
              { key: "email", label: "Email", icon: <MailIcon size={14} /> },
              { key: "phone", label: "Phone", icon: <PhoneIcon size={14} /> },
              { key: "website", label: "Website", icon: <GlobeIcon size={14} /> }
            ].map(({ key, label, icon }) => (
              <div className="detail-field" key={key}>
                <span className="detail-field__label">{icon} {label}</span>
                {editing ? (
                  <input
                    type={key === "email" ? "email" : key === "website" ? "url" : "text"}
                    value={editData[key] || ""}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                  />
                ) : (
                  <span className="detail-field__value">
                    {(() => {
                      const val = lead[key];
                      if (!val || val === "—" || val === "N/A") {
                        return <span style={{ color: "var(--text-muted)" }}>—</span>;
                      }
                      if (key === "website") {
                        const href = val.startsWith("http") ? val : `https://${val}`;
                        return (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "var(--accent-primary)", textDecoration: "underline", wordBreak: "break-all" }}
                          >
                            {val} ↗
                          </a>
                        );
                      }
                      if (key === "email") {
                        return (
                          <a
                            href={`mailto:${val}`}
                            style={{ color: "var(--accent-primary)", textDecoration: "underline" }}
                          >
                            {val}
                          </a>
                        );
                      }
                      if (key === "phone") {
                        const cleanP = val.replace(/[^0-9]/g, "");
                        return (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                            <a
                              href={`tel:${cleanP}`}
                              style={{ color: "var(--text-primary)", fontWeight: "600" }}
                            >
                              {val}
                            </a>
                            <a
                              href={`https://wa.me/${cleanP}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                fontSize: "11px",
                                background: "#25D366",
                                color: "#FFF",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                textDecoration: "none",
                                fontWeight: "700"
                              }}
                              title="Chat on WhatsApp"
                            >
                              WhatsApp
                            </a>
                          </div>
                        );
                      }
                      return val;
                    })()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Business Information */}
        <div className="detail-card">
          <h3>Business Information</h3>
          <div className="detail-card__fields">
            <div className="detail-field">
              <span className="detail-field__label" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <AnimatedEmoji emoji="🏭" size={15} />
                <span>Industry</span>
              </span>
              {editing ? (
                <input
                  type="text"
                  value={editData.industry || ""}
                  onChange={(e) => handleInputChange("industry", e.target.value)}
                />
              ) : (
                <span className="detail-field__value">{lead.industry || "—"}</span>
              )}
            </div>
            <div className="detail-field">
              <span className="detail-field__label" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <AnimatedEmoji emoji="📍" size={15} />
                <span>Location</span>
              </span>
              {editing ? (
                <input
                  type="text"
                  value={editData.location || ""}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                />
              ) : (
                <span className="detail-field__value">{lead.location || "—"}</span>
              )}
            </div>
            <div className="detail-field">
              <span className="detail-field__label" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <AnimatedEmoji emoji="📂" size={15} />
                <span>Source</span>
              </span>
              <span className="detail-field__value">{lead.source || "manual"}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field__label" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <AnimatedEmoji emoji="🔄" size={15} />
                <span>Status</span>
              </span>
              {editing ? (
                <select
                  value={editData.status || "new"}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                >
                  {statusOptions.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              ) : (
                <span className="detail-field__value">{lead.status}</span>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="detail-card detail-card--full">
          <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AnimatedEmoji emoji="📝" size={18} />
            <span>Notes</span>
          </h3>
          {editing ? (
            <textarea
              className="detail-textarea"
              value={editData.notes || ""}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Add notes about this lead..."
              rows={4}
            />
          ) : (
            <p className="detail-card__text">{lead.notes || "No notes added yet."}</p>
          )}
        </div>

        {/* Additional Spreadsheet / Custom Fields */}
        {lead.customFields && Object.keys(lead.customFields).length > 0 && (
          <div className="detail-card detail-card--full">
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AnimatedEmoji emoji="📊" size={18} />
              <span>Additional Spreadsheet Fields</span>
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "14px",
                marginTop: "12px"
              }}
            >
              {Object.entries(lead.customFields).map(([key, val]) => (
                <div className="detail-field" key={key}>
                  <span className="detail-field__label">{key}</span>
                  <span className="detail-field__value">
                    {val !== undefined && val !== null && String(val) !== ""
                      ? String(val)
                      : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lead Intelligence & Verification Engine Card */}
        <div className="detail-card detail-card--full" style={{ border: "1px solid rgba(79, 70, 229, 0.2)", background: "#FFFFFF" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldCheckIcon size={20} color="var(--accent-primary)" />
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>
                Lead Intelligence & Verification Engine
              </h3>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {lead.verification?.lastVerifiedAt && (
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Verified: {new Date(lead.verification.lastVerifiedAt).toLocaleString()}
                </span>
              )}
              <button
                type="button"
                className="btn btn--sm btn--primary"
                onClick={() => handleVerifyLead(true)}
                disabled={verifying}
                style={{
                  background: "linear-gradient(135deg, #4F46E5, #6366F1)",
                  boxShadow: "0 2px 8px rgba(79, 70, 229, 0.25)",
                  fontSize: "12px",
                  padding: "5px 12px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <ShieldCheckIcon size={14} />
                <span>{verifying ? "Inspecting Live Sources..." : lead.verification?.lastVerifiedAt ? "Re-Verify Facts" : "Verify Lead Facts"}</span>
              </button>
            </div>
          </div>

          {/* Verification Score & Safety Status Overview */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
              padding: "16px",
              backgroundColor: "var(--bg-tertiary)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-color-light)",
              marginBottom: "16px"
            }}
          >
            <div>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>
                VERIFICATION TRUST SCORE
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontSize: "28px", fontWeight: "800", color: vBadge.color }}>
                  {lead.verification?.score || 0}
                </span>
                <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-muted)" }}>/ 100</span>
                <span
                  style={{
                    marginLeft: "auto",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: "700",
                    background: vBadge.bg,
                    color: vBadge.color,
                    border: `1px solid ${vBadge.border}`
                  }}
                >
                  {vBadge.emoji} {vBadge.label}
                </span>
              </div>
              <div style={{ height: "6px", width: "100%", background: "#E2E8F0", borderRadius: "3px", overflow: "hidden", marginTop: "8px" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, Math.max(0, lead.verification?.score || 0))}%`,
                    backgroundColor: vBadge.color,
                    transition: "width 0.4s ease"
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>
                CORROBORATION LEVEL
              </div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>
                {lead.verification?.signals?.multiSourceCorroborated
                  ? "🛡️ Multi-Source Verified"
                  : lead.verification?.signals?.domainActive
                  ? "⚡ Single Source (Website)"
                  : "⚪ Unverified / Pending"}
              </div>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "4px 0 0 0", lineHeight: "1.4" }}>
                Safety Rule: High Confidence (90+) strictly requires independent cross-source confirmation. Single source verification is capped at &le;89.
              </p>
            </div>
          </div>

          {/* Warnings & Conflict Resolution Banner */}
          {lead.verification?.warnings && lead.verification.warnings.length > 0 && (
            <div
              style={{
                padding: "14px 16px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "#FFFBEB",
                border: "1px solid #FDE68A",
                marginBottom: "16px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "700", color: "#B45309", fontSize: "13px", marginBottom: "8px" }}>
                <TriangleAlertIcon size={16} color="#D97706" />
                <span>Detected Data Inconsistencies & Warnings</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "12px", color: "#92400E", lineHeight: "1.6" }}>
                {lead.verification.warnings.map((warn, i) => (
                  <li key={i}>{typeof warn === "string" ? warn : warn?.message || String(warn)}</li>
                ))}
              </ul>

              {/* Conflict resolution quick actions */}
              {lead.verification.evidence && (
                <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap", paddingTop: "8px", borderTop: "1px dashed #FCD34D" }}>
                  {lead.verification.evidence.websitePhones && lead.verification.evidence.websitePhones.length > 0 && (
                    lead.verification.evidence.websitePhones.map((ph, idx) => (
                      <button
                        key={`phone-${idx}`}
                        type="button"
                        className="btn btn--sm btn--ghost"
                        onClick={() => handleApplyEvidence("phone", ph)}
                        style={{ fontSize: "11px", padding: "3px 8px", borderColor: "#D97706", color: "#B45309", background: "#FFFFFF" }}
                      >
                        📞 Apply Detected Phone: {ph}
                      </button>
                    ))
                  )}
                  {lead.verification.evidence.websiteEmails && lead.verification.evidence.websiteEmails.length > 0 && (
                    lead.verification.evidence.websiteEmails.map((em, idx) => (
                      <button
                        key={`email-${idx}`}
                        type="button"
                        className="btn btn--sm btn--ghost"
                        onClick={() => handleApplyEvidence("email", em)}
                        style={{ fontSize: "11px", padding: "3px 8px", borderColor: "#D97706", color: "#B45309", background: "#FFFFFF" }}
                      >
                        ✉️ Apply Detected Email: {em}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Corroborated Signals Checklist */}
          <div>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "10px" }}>
              Fact Check Signals & Signals Audit
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "10px" }}>
              {[
                { label: "Website Reachable (HTTP 200)", active: lead.verification?.signals?.domainActive },
                { label: "HTTPS Secured", active: lead.verification?.signals?.httpsSecured },
                { label: "Domain Matches Brand", active: lead.verification?.signals?.domainMatchesCompany },
                { label: "Phone Corroborated on Web", active: lead.verification?.signals?.phoneMatchesWebsite },
                { label: "Email Matches Domain", active: lead.verification?.signals?.emailMatchesDomain },
                { label: "Location Corroborated", active: lead.verification?.signals?.locationMatches },
                { label: "Registered Entity Match", active: lead.verification?.signals?.registryMatch },
                { label: "Multi-Source Corroborated", active: lead.verification?.signals?.multiSourceCorroborated }
              ].map((sig, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    background: sig.active ? "rgba(22, 163, 74, 0.06)" : "var(--bg-tertiary)",
                    border: `1px solid ${sig.active ? "rgba(22, 163, 74, 0.25)" : "var(--border-color-light)"}`,
                    fontSize: "12px",
                    color: sig.active ? "#15803D" : "var(--text-muted)",
                    fontWeight: sig.active ? "600" : "400"
                  }}
                >
                  {sig.active ? <CheckIcon size={14} color="#16A34A" /> : <span style={{ width: 14, height: 14, display: "inline-block", textAlign: "center" }}>—</span>}
                  <span>{sig.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sources Evidence Breakdown */}
          {lead.verification?.evidence && (
            <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid var(--border-color-light)" }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>
                INSPECTED EVIDENCE DETAILS
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "12px", color: "var(--text-secondary)" }}>
                {lead.verification.evidence.websiteTitle && (
                  <div>
                    <span style={{ fontWeight: "600" }}>Page Title:</span> <em>"{lead.verification.evidence.websiteTitle}"</em>
                  </div>
                )}
                {lead.verification.evidence.websiteCanonicalDomain && (
                  <div>
                    <span style={{ fontWeight: "600" }}>Canonical Domain:</span> {lead.verification.evidence.websiteCanonicalDomain}
                  </div>
                )}
                {lead.verification.evidence.websiteHttpStatus && (
                  <div>
                    <span style={{ fontWeight: "600" }}>HTTP Status:</span> {lead.verification.evidence.websiteHttpStatus}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Verification Audit History */}
          {lead.verification?.verificationHistory && lead.verification.verificationHistory.length > 0 && (
            <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid var(--border-color-light)" }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>
                VERIFICATION AUDIT TRAIL ({lead.verification.verificationHistory.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {lead.verification.verificationHistory.slice(-3).reverse().map((h, i) => (
                  <div key={i} style={{ fontSize: "11px", color: "var(--text-secondary)", display: "flex", gap: "10px" }}>
                    <span>{new Date(h.verifiedAt).toLocaleString()}:</span>
                    <strong style={{ color: "var(--text-primary)" }}>Score {h.score}/100</strong>
                    <span>({h.status})</span>
                    <span style={{ color: "var(--text-muted)" }}>• {h.triggeredBy}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Section — Powered by Gemini */}
        <div className="detail-card detail-card--full detail-card--ai">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
            <h3>✨ AI Business Analysis & Scoring (Gemini 3.6 Flash)</h3>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {lead.aiAnalysis && (
                <button
                  className="btn btn--sm btn--ghost"
                  onClick={() => setShowAiModal(true)}
                  style={{ fontWeight: "600" }}
                >
                  ⚡ View Full Intelligence Modal
                </button>
              )}
              <button
                className="btn btn--primary btn--sm"
                onClick={handleRunAI}
                disabled={analyzing}
                style={{
                  background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                  boxShadow: "0 2px 10px rgba(124, 58, 237, 0.3)"
                }}
              >
                {analyzing ? "⚡ Analyzing with Gemini..." : lead.aiAnalysis ? "🔄 Re-Analyze Lead" : "✨ Analyze with AI"}
              </button>
            </div>
          </div>

          {lead.aiAnalysis ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {(() => {
                let parsed = null;
                try {
                  parsed = typeof lead.aiAnalysis === "string" ? JSON.parse(lead.aiAnalysis) : lead.aiAnalysis;
                } catch {
                  parsed = { summary: lead.aiAnalysis, opportunities: [] };
                }

                return (
                  <>
                    {parsed.summary && (
                      <div className="detail-field">
                        <span className="detail-field__label">Executive Summary</span>
                        <p className="detail-card__text" style={{ fontSize: "14px", lineHeight: "1.6" }}>
                          {parsed.summary}
                        </p>
                      </div>
                    )}

                    {parsed.opportunities && parsed.opportunities.length > 0 && (
                      <div className="detail-field">
                        <span className="detail-field__label">Identified Growth & Sales Opportunities</span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "6px" }}>
                          {parsed.opportunities.map((opp, idx) => (
                            <span key={idx} className="badge badge--primary" style={{ padding: "6px 12px", fontSize: "13px" }}>
                              🚀 {opp}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {parsed.outreachAngle && (
                      <div className="detail-field">
                        <span className="detail-field__label">Strategic Outreach Angle</span>
                        <span className="detail-field__value" style={{ fontWeight: "600", color: "var(--accent-primary)" }}>
                          🎯 {parsed.outreachAngle}
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="ai-placeholder">
              <span className="ai-placeholder__icon">🧠</span>
              <p>Analyze this business with Google Gemini AI to uncover growth opportunities, calculate lead score, and draft a personalized outreach message.</p>
              <button
                className="btn btn--primary"
                onClick={handleRunAI}
                disabled={analyzing}
                style={{
                  background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                  marginTop: "8px"
                }}
              >
                {analyzing ? "⚡ Analyzing..." : "✨ Run AI Analysis Now"}
              </button>
            </div>
          )}
        </div>

        {/* AI Outreach Pitch Card */}
        <div className="detail-card detail-card--full detail-card--ai">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
            <h3>✍️ Tailored B2B Outreach Pitch</h3>
            {lead.aiMessage && (
              <button
                className="btn btn--sm btn--ghost"
                onClick={handleCopy}
                style={{ fontWeight: "600" }}
              >
                {copied ? "✅ Copied to Clipboard!" : "📋 Copy Pitch"}
              </button>
            )}
          </div>

          {lead.aiMessage ? (
            <div>
              <div
                style={{
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-primary)",
                  borderRadius: "var(--radius-sm)",
                  padding: "16px 18px",
                  fontSize: "14px",
                  lineHeight: "1.7",
                  whiteSpace: "pre-wrap",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)"
                }}
              >
                {lead.aiMessage}
              </div>

              {lead.phone && (
                <div style={{ marginTop: "14px", display: "flex", gap: "10px" }}>
                  <a
                    href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(lead.aiMessage)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn--sm btn--primary"
                    style={{ background: "#25D366", color: "#FFF" }}
                  >
                    💬 Send via WhatsApp
                  </a>
                  {lead.email && (
                    <a
                      href={`mailto:${lead.email}?subject=${encodeURIComponent(`Quick question regarding ${lead.companyName}`)}&body=${encodeURIComponent(lead.aiMessage)}`}
                      className="btn btn--sm btn--ghost"
                    >
                      ✉️ Send via Email
                    </a>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="ai-placeholder">
              <span className="ai-placeholder__icon">💬</span>
              <p>Click "Analyze with AI" above to generate a custom, non-pushy outreach pitch for this business.</p>
            </div>
          )}
        </div>
      </div>

      <div className="lead-details__timestamps">
        <span>Created: {new Date(lead.createdAt).toLocaleDateString()}</span>
        <span>Updated: {new Date(lead.updatedAt).toLocaleDateString()}</span>
      </div>

      <AiIntelligenceModal
        isOpen={showAiModal}
        lead={lead}
        onClose={() => setShowAiModal(false)}
        onReAnalyze={handleRunAI}
        reAnalyzing={analyzing}
      />
    </div>
  );
};

export default LeadDetails;
