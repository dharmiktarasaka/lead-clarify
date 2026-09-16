import { useState } from "react";
import {
  SparklesIcon,
  XIcon,
  StoreIcon,
  SearchIcon,
  PencilIcon,
  LightbulbIcon,
  MapPinIcon,
  GlobeIcon,
  StarIcon,
  RocketIcon,
  MessageCircleIcon,
  MailIcon,
  PhoneIcon,
  CopyIcon,
  CheckIcon,
  RefreshCwIcon,
  FlameIcon,
  UserIcon
} from "@animateicons/react/lucide";

const AiIntelligenceModal = ({
  lead,
  aiData,
  isOpen,
  onClose,
  onReAnalyze,
  reAnalyzing = false
}) => {
  if (!isOpen || !lead) return null;

  const [activeTab, setActiveTab] = useState("intelligence"); // 'intelligence' | 'audit' | 'outreach'
  const [outreachChannel, setOutreachChannel] = useState("whatsapp"); // 'whatsapp' | 'email' | 'call'
  const [copiedKey, setCopiedKey] = useState("");

  // Normalize AI Data
  let analysis = aiData;
  if (!analysis && lead.aiAnalysis) {
    try {
      analysis = typeof lead.aiAnalysis === "string" ? JSON.parse(lead.aiAnalysis) : lead.aiAnalysis;
    } catch {
      analysis = {
        summary: lead.aiAnalysis,
        opportunities: [],
        outreachAngle: ""
      };
    }
  }

  if (!analysis) {
    analysis = {
      score: lead.score || 70,
      scoreCategory: lead.score >= 80 ? "Hot" : lead.score >= 50 ? "Warm" : "Cold",
      summary: "Analysis data is being processed.",
      opportunities: []
    };
  }

  const score = analysis.score ?? lead.score ?? 70;
  const scoreCategory = analysis.scoreCategory || (score >= 80 ? "Hot" : score >= 50 ? "Warm" : "Cold");
  const scoreBadgeClass = score >= 80 ? "score--hot" : score >= 50 ? "score--warm" : "score--cold";

  const handleCopyText = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 2200);
  };

  const whatsappMessage =
    analysis.outreachChannels?.whatsapp ||
    analysis.outreachMessage ||
    lead.aiMessage ||
    "";

  const emailSubject =
    analysis.outreachChannels?.emailSubject ||
    `Growth opportunity for ${lead.companyName}`;

  const emailBody =
    analysis.outreachChannels?.emailBody ||
    analysis.outreachMessage ||
    lead.aiMessage ||
    "";

  const coldCallPitch =
    analysis.outreachChannels?.coldCallPitch ||
    analysis.outreachAngle ||
    "";

  const cleanPhone = (lead.phone || "").replace(/[^0-9]/g, "");

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal modal--lg"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "840px",
          width: "94%",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden"
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "20px 26px",
            background: "linear-gradient(135deg, #172033 0%, #1E293B 100%)",
            color: "#FFFFFF",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "1px solid rgba(255,255,255,0.1)"
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span
                style={{
                  background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                  color: "#FFF",
                  fontSize: "11px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  letterSpacing: "0.05em",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <SparklesIcon size={13} color="#FFF" /> {analysis?.model ? `${analysis.model} Intelligence` : "Groq LLaMA 3.3 Intelligence"}
              </span>
              <span
                className={`lead-table__score ${scoreBadgeClass}`}
                style={{
                  background: "rgba(255,255,255,0.12)",
                  color: "#FFF",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontWeight: "700",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                {score >= 80 ? <FlameIcon size={14} color="#F87171" /> : <StarIcon size={14} color="#FBBF24" />}
                Score {score}/100 • {scoreCategory} Lead
              </span>
            </div>
            <h2 style={{ fontSize: "22px", color: "#FFFFFF", marginTop: "10px", marginBottom: "6px" }}>
              {lead.companyName}
            </h2>
            <p style={{ fontSize: "13px", color: "#94A3B8", margin: 0, display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <MapPinIcon size={13} color="#94A3B8" /> {lead.location || "Location N/A"}
              </span>
              <span>•</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <StoreIcon size={13} color="#94A3B8" /> {lead.industry || "General Industry"}
              </span>
              <span>•</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <UserIcon size={13} color="#94A3B8" /> {lead.contactName || "Decision Maker"}
              </span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="modal__close"
            style={{ color: "#94A3B8", padding: "4px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            title="Close modal"
          >
            <XIcon size={20} color="#94A3B8" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--border-primary)",
            background: "var(--bg-secondary)",
            padding: "0 20px"
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("intelligence")}
            style={{
              padding: "14px 18px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "intelligence" ? "3px solid var(--accent-primary)" : "3px solid transparent",
              color: activeTab === "intelligence" ? "var(--accent-primary)" : "var(--text-secondary)",
              fontWeight: activeTab === "intelligence" ? "700" : "500",
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <StoreIcon size={16} color={activeTab === "intelligence" ? "var(--accent-primary)" : "var(--text-secondary)"} />
            Business Profile
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            style={{
              padding: "14px 18px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "audit" ? "3px solid var(--accent-primary)" : "3px solid transparent",
              color: activeTab === "audit" ? "var(--accent-primary)" : "var(--text-secondary)",
              fontWeight: activeTab === "audit" ? "700" : "500",
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <SearchIcon size={16} color={activeTab === "audit" ? "var(--accent-primary)" : "var(--text-secondary)"} />
            Digital Gaps & Opportunities
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("outreach")}
            style={{
              padding: "14px 18px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "outreach" ? "3px solid var(--accent-primary)" : "3px solid transparent",
              color: activeTab === "outreach" ? "var(--accent-primary)" : "var(--text-secondary)",
              fontWeight: activeTab === "outreach" ? "700" : "500",
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <PencilIcon size={16} color={activeTab === "outreach" ? "var(--accent-primary)" : "var(--text-secondary)"} />
            Tailored Outreach Pitches
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div
          style={{
            padding: "24px 26px",
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "20px"
          }}
        >
          {/* TAB 1: Business Profile & Inferred Details */}
          {activeTab === "intelligence" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Executive Summary */}
              <div
                style={{
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-primary)",
                  borderRadius: "var(--radius-sm)",
                  padding: "16px 18px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <LightbulbIcon size={18} color="var(--accent-primary)" />
                  <span style={{ fontSize: "13px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
                    Executive Business Summary
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.7", color: "var(--text-primary)" }}>
                  {analysis.summary || "No executive summary available."}
                </p>
                {analysis.scoreReason && (
                  <div style={{ marginTop: "12px", fontSize: "13px", color: "var(--accent-primary)", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                    <SparklesIcon size={14} color="var(--accent-primary)" />
                    Score Evaluation: {analysis.scoreReason}
                  </div>
                )}
              </div>

              {/* Inferred Details Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: "14px"
                }}
              >
                {/* Target Audience */}
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid var(--border-primary)",
                    borderRadius: "var(--radius-sm)",
                    padding: "14px 16px"
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                    <UserIcon size={14} color="var(--accent-primary)" /> Target Customer Persona
                  </span>
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--text-primary)", lineHeight: "1.5" }}>
                    {analysis.inferredProfile?.targetAudience || `Affluent local customers and clients seeking services in ${lead.location || "their area"}.`}
                  </p>
                </div>

                {/* Decision Maker & Deal Value */}
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid var(--border-primary)",
                    borderRadius: "var(--radius-sm)",
                    padding: "14px 16px"
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                    <StarIcon size={14} color="var(--accent-primary)" /> Inferred Role & Value
                  </span>
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--text-primary)" }}>
                    <strong>Role:</strong> {analysis.inferredProfile?.inferredRole || "Managing Director / Owner"}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--text-primary)" }}>
                    <strong>Est. Deal Size:</strong> {analysis.inferredProfile?.estimatedTicketSize || "Mid to High-Ticket"}
                  </p>
                </div>
              </div>

              {/* Core Services / Specialties */}
              {analysis.inferredProfile?.coreServices && analysis.inferredProfile.coreServices.length > 0 && (
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid var(--border-primary)",
                    borderRadius: "var(--radius-sm)",
                    padding: "16px 18px"
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                    <StarIcon size={14} color="var(--accent-primary)" /> Key Service Offerings & Specializations
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {analysis.inferredProfile.coreServices.map((service, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: "var(--accent-light)",
                          color: "var(--accent-primary)",
                          padding: "6px 12px",
                          borderRadius: "16px",
                          fontSize: "13px",
                          fontWeight: "600",
                          border: "1px solid rgba(79, 70, 229, 0.2)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px"
                        }}
                      >
                        <CheckIcon size={12} color="var(--accent-primary)" /> {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Strategic Angle */}
              {analysis.outreachAngle && (
                <div
                  style={{
                    background: "rgba(79, 70, 229, 0.05)",
                    border: "1px solid rgba(79, 70, 229, 0.2)",
                    borderRadius: "var(--radius-sm)",
                    padding: "14px 18px"
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--accent-primary)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                    <SparklesIcon size={14} color="var(--accent-primary)" /> Primary Pitch Angle
                  </span>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
                    "{analysis.outreachAngle}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Digital Gaps & Opportunities */}
          {activeTab === "audit" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Digital Audit Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
                {/* Google Maps / Local SEO */}
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid var(--border-primary)",
                    borderRadius: "var(--radius-sm)",
                    padding: "16px 18px",
                    display: "flex",
                    gap: "14px",
                    alignItems: "flex-start"
                  }}
                >
                  <div style={{ padding: "8px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", display: "flex" }}>
                    <MapPinIcon size={22} color="#EF4444" />
                  </div>
                  <div>
                    <strong style={{ fontSize: "14px", color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>
                      Google Maps & Local Search Ranking Gap
                    </strong>
                    <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                      {analysis.digitalAudit?.googleMapsGaps || `Opportunity to rank top in Google Local 3-Pack for ${lead.industry || "business"} in ${lead.location || "Ahmedabad"}.`}
                    </p>
                  </div>
                </div>

                {/* Website & Online Booking */}
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid var(--border-primary)",
                    borderRadius: "var(--radius-sm)",
                    padding: "16px 18px",
                    display: "flex",
                    gap: "14px",
                    alignItems: "flex-start"
                  }}
                >
                  <div style={{ padding: "8px", background: "rgba(59, 130, 246, 0.1)", borderRadius: "8px", display: "flex" }}>
                    <GlobeIcon size={22} color="#3B82F6" />
                  </div>
                  <div>
                    <strong style={{ fontSize: "14px", color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>
                      Website & Lead Funnel Conversion Flaws
                    </strong>
                    <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                      {analysis.digitalAudit?.websiteBookingGaps || "Lacks 24/7 automated booking and direct WhatsApp customer enquiry funnel."}
                    </p>
                  </div>
                </div>

                {/* Social & Reputation */}
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid var(--border-primary)",
                    borderRadius: "var(--radius-sm)",
                    padding: "16px 18px",
                    display: "flex",
                    gap: "14px",
                    alignItems: "flex-start"
                  }}
                >
                  <div style={{ padding: "8px", background: "rgba(245, 158, 11, 0.1)", borderRadius: "8px", display: "flex" }}>
                    <StarIcon size={22} color="#F59E0B" />
                  </div>
                  <div>
                    <strong style={{ fontSize: "14px", color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>
                      Reputation & Social Proof Strategy
                    </strong>
                    <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                      {analysis.digitalAudit?.socialReputationGaps || "Needs automated review collection system and local video reel marketing."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actionable Opportunities */}
              {analysis.opportunities && analysis.opportunities.length > 0 && (
                <div>
                  <h4 style={{ fontSize: "14px", color: "var(--text-primary)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <RocketIcon size={16} color="var(--accent-primary)" /> High-ROI Solutions You Can Pitch Them:
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {analysis.opportunities.map((opp, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: "var(--bg-secondary)",
                          borderLeft: "4px solid var(--accent-primary)",
                          padding: "12px 16px",
                          borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px"
                        }}
                      >
                        <span style={{ fontWeight: "700", color: "var(--accent-primary)" }}>#{idx + 1}</span>
                        <span style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: "1.5" }}>{opp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Tailored Outreach Pitches */}
          {activeTab === "outreach" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Channel Selector Pills */}
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setOutreachChannel("whatsapp")}
                  className={`btn btn--sm ${outreachChannel === "whatsapp" ? "btn--primary" : "btn--ghost"}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: outreachChannel === "whatsapp" ? "#25D366" : undefined,
                    borderColor: outreachChannel === "whatsapp" ? "#25D366" : undefined,
                    color: outreachChannel === "whatsapp" ? "#FFF" : undefined
                  }}
                >
                  <MessageCircleIcon size={15} color={outreachChannel === "whatsapp" ? "#FFF" : "currentColor"} />
                  WhatsApp Message
                </button>

                <button
                  type="button"
                  onClick={() => setOutreachChannel("email")}
                  className={`btn btn--sm ${outreachChannel === "email" ? "btn--primary" : "btn--ghost"}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <MailIcon size={15} color={outreachChannel === "email" ? "#FFF" : "currentColor"} />
                  Cold Email Pitch
                </button>

                <button
                  type="button"
                  onClick={() => setOutreachChannel("call")}
                  className={`btn btn--sm ${outreachChannel === "call" ? "btn--primary" : "btn--ghost"}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <PhoneIcon size={15} color={outreachChannel === "call" ? "#FFF" : "currentColor"} />
                  Phone Call Script
                </button>
              </div>

              {/* WhatsApp View */}
              {outreachChannel === "whatsapp" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div
                    style={{
                      background: "#F0FDF4",
                      border: "1px solid #BBF7D0",
                      borderRadius: "var(--radius-sm)",
                      padding: "16px 18px",
                      fontSize: "14px",
                      lineHeight: "1.7",
                      whiteSpace: "pre-wrap",
                      color: "#166534",
                      fontFamily: "var(--font-sans)"
                    }}
                  >
                    {whatsappMessage}
                  </div>

                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn--sm btn--ghost"
                      onClick={() => handleCopyText(whatsappMessage, "whatsapp")}
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      {copiedKey === "whatsapp" ? (
                        <>
                          <CheckIcon size={14} color="#166534" /> Copied WhatsApp Message!
                        </>
                      ) : (
                        <>
                          <CopyIcon size={14} /> Copy Message
                        </>
                      )}
                    </button>

                    {cleanPhone ? (
                      <a
                        href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn--sm btn--primary"
                        style={{ background: "#25D366", color: "#FFF", display: "inline-flex", alignItems: "center", gap: "6px" }}
                      >
                        <MessageCircleIcon size={14} color="#FFF" /> Open in WhatsApp ({lead.phone})
                      </a>
                    ) : (
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn--sm btn--ghost"
                        title="Open WhatsApp Web and choose contact"
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                      >
                        <MessageCircleIcon size={14} /> Share on WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Email View */}
              {outreachChannel === "email" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ background: "var(--bg-tertiary)", padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-primary)" }}>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-muted)", display: "block" }}>SUBJECT LINE:</span>
                    <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>{emailSubject}</strong>
                  </div>

                  <div
                    style={{
                      background: "#FFFFFF",
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
                    {emailBody}
                  </div>

                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn--sm btn--ghost"
                      onClick={() => handleCopyText(`Subject: ${emailSubject}\n\n${emailBody}`, "email")}
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      {copiedKey === "email" ? (
                        <>
                          <CheckIcon size={14} color="#4F46E5" /> Copied Full Email!
                        </>
                      ) : (
                        <>
                          <CopyIcon size={14} /> Copy Email & Subject
                        </>
                      )}
                    </button>

                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`}
                        className="btn btn--sm btn--primary"
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                      >
                        <MailIcon size={14} color="#FFF" /> Open in Mail Client ({lead.email})
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Phone Script View */}
              {outreachChannel === "call" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div
                    style={{
                      background: "#FFFBEB",
                      border: "1px solid #FDE68A",
                      borderRadius: "var(--radius-sm)",
                      padding: "16px 18px",
                      fontSize: "14px",
                      lineHeight: "1.7",
                      whiteSpace: "pre-wrap",
                      color: "#92400E",
                      fontFamily: "var(--font-sans)"
                    }}
                  >
                    {coldCallPitch}
                  </div>

                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn--sm btn--ghost"
                      onClick={() => handleCopyText(coldCallPitch, "call")}
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      {copiedKey === "call" ? (
                        <>
                          <CheckIcon size={14} color="#92400E" /> Copied Phone Script!
                        </>
                      ) : (
                        <>
                          <CopyIcon size={14} /> Copy Phone Script
                        </>
                      )}
                    </button>
                    {lead.phone && (
                      <a
                        href={`tel:${cleanPhone}`}
                        className="btn btn--sm btn--primary"
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                      >
                        <PhoneIcon size={14} color="#FFF" /> Call {lead.phone}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: "16px 26px",
            borderTop: "1px solid var(--border-primary)",
            background: "var(--bg-secondary)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px"
          }}
        >
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={() => onReAnalyze?.(lead._id)}
              disabled={reAnalyzing}
              title="Refresh intelligence with Gemini AI (Costs 98 credits)"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <RefreshCwIcon size={14} />
              {reAnalyzing ? "Re-Analyzing..." : "Re-Analyze with AI (98 credits)"}
            </button>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={onClose}
              style={{ minWidth: "90px" }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiIntelligenceModal;
