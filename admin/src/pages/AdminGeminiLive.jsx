import { useState, useEffect } from "react";
import {
  getAdminGeminiStatus,
  testAdminGeminiPing,
  testAdminGeminiLiveAudit,
  getAdminGlobalLeads
} from "../services/api";
import {
  SparklesIcon,
  ZapIcon,
  ActivityIcon,
  CheckIcon,
  CopyIcon,
  FlameIcon,
  StarIcon,
  PhoneIcon,
  MailIcon,
  RefreshCwIcon,
  GlobeIcon,
  ShieldCheckIcon,
  TerminalIcon,
  SearchIcon
} from "@animateicons/react/lucide";

const AdminGeminiLive = () => {
  // Status state
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Ping Diagnostic state
  const [pingPrompt, setPingPrompt] = useState(
    "In 1 sentence, explain how AI automated lead qualification boosts B2B agency sales."
  );
  const [pingLoading, setPingLoading] = useState(false);
  const [pingResult, setPingResult] = useState(null);
  const [pingError, setPingError] = useState(null);

  // Live Lead Audit state
  const [companyName, setCompanyName] = useState("Panchveda Ayurveda Clinic");
  const [industry, setIndustry] = useState("Healthcare & Holistic Wellness");
  const [location, setLocation] = useState("Ahmedabad, Gujarat");
  const [website, setWebsite] = useState("https://panchveda.com");
  const [notes, setNotes] = useState("Specializes in authentic Panchakarma treatments and chronic joint pain therapy.");
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [auditError, setAuditError] = useState(null);
  const [copiedType, setCopiedType] = useState(null);

  // Existing system leads for quick load
  const [leadsList, setLeadsList] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState("");

  const presets = [
    {
      label: "Ayurveda Wellness Clinic",
      companyName: "Panchveda Ayurveda Clinic",
      industry: "Healthcare & Alternative Medicine",
      location: "Ahmedabad, Gujarat",
      website: "https://panchveda.com",
      notes: "Offers specialized detox, panchakarma therapies, and lifestyle consultations."
    },
    {
      label: "B2B SaaS Startup",
      companyName: "CloudScale Analytics",
      industry: "Enterprise Software / Cloud",
      location: "Bengaluru, Karnataka",
      website: "https://cloudscale.io",
      notes: "Provides automated cloud infrastructure cost optimization for mid-sized tech teams."
    },
    {
      label: "Commercial Real Estate Firm",
      companyName: "Apex Capital Realty",
      industry: "Commercial Real Estate & Leasing",
      location: "Mumbai, Maharashtra",
      website: "https://apexrealty.in",
      notes: "Brokers high-ticket commercial office spaces and industrial parks in BKC and Navi Mumbai."
    },
    {
      label: "Cosmetic & Dental Studio",
      companyName: "Dr. Smile Aesthetics",
      industry: "Dental Care & Cosmetic Dentistry",
      location: "Pune, Maharashtra",
      website: "https://drsmilepune.com",
      notes: "Focuses on high-margin invisible aligners, dental implants, and smile makeovers."
    }
  ];

  useEffect(() => {
    fetchStatus();
    loadExistingLeads();
  }, []);

  const fetchStatus = async () => {
    try {
      setStatusLoading(true);
      const { data } = await getAdminGeminiStatus();
      setStatus(data);
    } catch (err) {
      console.error("Failed to load Gemini status:", err);
    } finally {
      setStatusLoading(false);
    }
  };

  const loadExistingLeads = async () => {
    try {
      const { data } = await getAdminGlobalLeads({ limit: 10 });
      setLeadsList(data.leads || []);
    } catch (err) {
      console.error("Failed to fetch leads for selector:", err);
    }
  };

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset.label);
    setCompanyName(preset.companyName);
    setIndustry(preset.industry);
    setLocation(preset.location);
    setWebsite(preset.website);
    setNotes(preset.notes);
  };

  const handleSelectRealLead = (e) => {
    const leadId = e.target.value;
    if (!leadId) return;
    const found = leadsList.find((l) => l._id === leadId);
    if (found) {
      setCompanyName(found.companyName || "");
      setIndustry(found.industry || "");
      setLocation(found.location || "");
      setWebsite(found.website || "");
      setNotes(found.contactName ? `Contact: ${found.contactName}` : "");
      setSelectedPreset(`System Lead: ${found.companyName}`);
    }
  };

  const handleRunPing = async () => {
    setPingLoading(true);
    setPingResult(null);
    setPingError(null);
    try {
      const { data } = await testAdminGeminiPing({ prompt: pingPrompt });
      setPingResult(data);
    } catch (err) {
      setPingError(err.response?.data || { error: err.message, statusCode: 500 });
    } finally {
      setPingLoading(false);
    }
  };

  const handleRunLiveAudit = async (e) => {
    e.preventDefault();
    setAuditLoading(true);
    setAuditResult(null);
    setAuditError(null);
    try {
      const payload = {
        companyName,
        industry,
        location,
        website,
        notes
      };
      const { data } = await testAdminGeminiLiveAudit(payload);
      setAuditResult(data);
    } catch (err) {
      setAuditError(err.response?.data || { error: err.message, statusCode: 500 });
    } finally {
      setAuditLoading(false);
    }
  };

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <h1 style={{ fontSize: "26px", fontWeight: "800", color: "var(--text-primary)", letterSpacing: "-0.02em", margin: 0 }}>
              Google Gemini AI Live Hub
            </h1>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 9px",
                borderRadius: "var(--radius-full)",
                background: "var(--accent-light)",
                color: "var(--accent-primary)",
                fontSize: "11px",
                fontWeight: "700",
                textTransform: "uppercase"
              }}
            >
              <ShieldCheckIcon size={12} /> Admin Exclusive
            </span>
          </div>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
            Real-time Google Generative Language API diagnostic, live B2B lead audits, and outreach generation
          </p>
        </div>

        <button
          onClick={fetchStatus}
          disabled={statusLoading}
          className="admin-btn admin-btn--secondary"
          title="Refresh Gemini connection status"
        >
          <RefreshCwIcon size={14} />
          <span>{statusLoading ? "Checking..." : "Refresh API Status"}</span>
        </button>
      </div>

      {/* Top Telemetry Row: Live API Status */}
      <div className="admin-stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 0 }}>
        <div className="admin-card stat-metric">
          <div className="stat-metric__header">
            <span className="stat-metric__label">API CONNECTION</span>
            <div className="stat-metric__icon" style={{ background: status?.configured ? "#F0FDF4" : "#FEF2F2", color: status?.configured ? "var(--success)" : "var(--danger)" }}>
              <ActivityIcon size={20} />
            </div>
          </div>
          <div className="stat-metric__val" style={{ fontSize: "20px" }}>
            {status?.configured ? "🟢 Configured" : "🔴 Missing Key"}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Key: <code style={{ color: "var(--accent-primary)", background: "var(--bg-tertiary)", padding: "1px 5px", borderRadius: "4px" }}>{status?.maskedKey || "..."}</code>
          </div>
        </div>

        <div className="admin-card stat-metric">
          <div className="stat-metric__header">
            <span className="stat-metric__label">ACTIVE MODEL</span>
            <div className="stat-metric__icon" style={{ background: "var(--accent-light)", color: "var(--accent-primary)" }}>
              <SparklesIcon size={20} />
            </div>
          </div>
          <div className="stat-metric__val" style={{ fontSize: "20px" }}>
            {status?.defaultModel || "gemini-3.6-flash"}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Provider: Google Cloud Vertex AI
          </div>
        </div>

        <div className="admin-card stat-metric">
          <div className="stat-metric__header">
            <span className="stat-metric__label">QUOTA & PRICING</span>
            <div className="stat-metric__icon" style={{ background: "#FFFBEB", color: "var(--warning)" }}>
              <ZapIcon size={20} />
            </div>
          </div>
          <div className="stat-metric__val" style={{ fontSize: "20px" }}>
            {status?.pricing || "₹0 / Free"}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            1,500 free requests / day (15 RPM)
          </div>
        </div>

        <div className="admin-card stat-metric">
          <div className="stat-metric__header">
            <span className="stat-metric__label">SYSTEM AI LEADS</span>
            <div className="stat-metric__icon" style={{ background: "#F0F9FF", color: "var(--info)" }}>
              <GlobeIcon size={20} />
            </div>
          </div>
          <div className="stat-metric__val" style={{ fontSize: "20px" }}>
            {status?.aiAnalyzedLeads ?? 0}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Deep audited leads in MongoDB
          </div>
        </div>
      </div>

      {/* Two Column Layout: Diagnostic Benchmark & Live B2B Lead Intelligence Auditor */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "24px", alignItems: "start" }}>
        
        {/* Left Column: Core Live Use Case - B2B Lead Intelligence Auditor */}
        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <SparklesIcon size={18} color="var(--accent-primary)" />
              <h2 style={{ fontSize: "17px", fontWeight: "800", color: "var(--text-primary)", margin: 0 }}>
                Live B2B Lead Intelligence Generator
              </h2>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px", margin: 0 }}>
              Audit any company live through Google Gemini API to analyze market positioning, digital gaps, and generate cold copy.
            </p>
          </div>

          {/* Quick Presets & Real DB Lead Selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase" }}>
                Quick Presets:
              </span>
              {leadsList.length > 0 && (
                <select
                  className="admin-input"
                  style={{ fontSize: "11px", padding: "4px 8px", width: "auto" }}
                  onChange={handleSelectRealLead}
                >
                  <option value="">Load From Database Leads...</option>
                  {leadsList.map((l) => (
                    <option key={l._id} value={l._id}>
                      {l.companyName} ({l.location || "No city"})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`admin-btn admin-btn--sm ${selectedPreset === p.label ? "admin-btn--primary" : "admin-btn--secondary"}`}
                  style={{ fontSize: "11px", padding: "4px 9px" }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Business Lead Form */}
          <form onSubmit={handleRunLiveAudit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "5px" }}>
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  className="admin-input"
                  style={{ width: "100%" }}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Panchveda Ayurveda Clinic"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "5px" }}>
                  Industry / Niche
                </label>
                <input
                  type="text"
                  className="admin-input"
                  style={{ width: "100%" }}
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Healthcare & Wellness"
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "5px" }}>
                  Location / City
                </label>
                <input
                  type="text"
                  className="admin-input"
                  style={{ width: "100%" }}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Ahmedabad, Gujarat"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "5px" }}>
                  Website / Domain
                </label>
                <input
                  type="text"
                  className="admin-input"
                  style={{ width: "100%" }}
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="e.g. https://company.com"
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "5px" }}>
                Target Context / Offerings
              </label>
              <textarea
                className="admin-input"
                rows={2}
                style={{ width: "100%", resize: "vertical" }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Key services, specialties, or observations..."
              />
            </div>

            <button
              type="submit"
              disabled={auditLoading}
              className="admin-btn admin-btn--primary"
              style={{ padding: "10px 16px", fontWeight: "700", justifyContent: "center" }}
            >
              <SparklesIcon size={16} />
              <span>{auditLoading ? "Invoking Google Gemini API..." : "Run Real-Time Gemini Intelligence Audit"}</span>
            </button>
          </form>

          {/* Audit Error Banner */}
          {auditError && (
            <div
              style={{
                padding: "12px 16px",
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: "var(--radius-sm)",
                color: "var(--danger)",
                fontSize: "13px"
              }}
            >
              <strong>⚠️ Gemini API Error ({auditError.statusCode || 500}):</strong>
              <p style={{ margin: "4px 0 0", wordBreak: "break-word" }}>{auditError.error || "Unable to reach Gemini."}</p>
              {auditError.quotaLimit && (
                <p style={{ margin: "6px 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>
                  💡 Google Free Tier requests per minute limit reached. Wait ~25 seconds and trigger again.
                </p>
              )}
            </div>
          )}

          {/* Live Lead Audit Results */}
          {auditResult && auditResult.leadAudit && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", borderTop: "1px solid var(--border-color-light)", paddingTop: "18px" }}>
              {/* Score & Telemetry Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      background: auditResult.leadAudit.score >= 80 ? "rgba(220, 38, 38, 0.12)" : "rgba(217, 119, 6, 0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "800",
                      fontSize: "18px",
                      color: auditResult.leadAudit.score >= 80 ? "var(--danger)" : "var(--warning)"
                    }}
                  >
                    {auditResult.leadAudit.score}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <strong style={{ fontSize: "15px", color: "var(--text-primary)" }}>
                        {auditResult.leadAudit.scoreCategory || "Analyzed"} Opportunity
                      </strong>
                      <span className={`badge-pill ${auditResult.leadAudit.score >= 80 ? "badge-pill--suspended" : "badge-pill--user"}`}>
                        {auditResult.leadAudit.score >= 80 ? <FlameIcon size={12} /> : <StarIcon size={12} />}
                        {auditResult.leadAudit.scoreCategory || "Qualified"}
                      </span>
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {auditResult.leadAudit.scoreReason}
                    </span>
                  </div>
                </div>

                <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--accent-primary)", background: "var(--accent-light)", padding: "3px 9px", borderRadius: "12px" }}>
                  ⚡ Roundtrip: {auditResult.latencyMs}ms
                </span>
              </div>

              {/* Summary */}
              {auditResult.leadAudit.summary && (
                <div style={{ background: "var(--bg-tertiary)", padding: "12px 14px", borderRadius: "var(--radius-sm)", fontSize: "13px", color: "var(--text-primary)" }}>
                  <strong style={{ display: "block", fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Executive Position Analysis
                  </strong>
                  {auditResult.leadAudit.summary}
                </div>
              )}

              {/* Digital Gaps */}
              {auditResult.leadAudit.digitalAudit && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                    Digital Growth & Audit Findings
                  </span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "6px" }}>
                    {auditResult.leadAudit.digitalAudit.googleMapsGaps && (
                      <div style={{ fontSize: "12px", padding: "8px 12px", background: "var(--bg-secondary)", border: "1px solid var(--border-color-light)", borderRadius: "6px" }}>
                        <strong style={{ color: "var(--warning)" }}>📍 Local SEO & Maps:</strong> {auditResult.leadAudit.digitalAudit.googleMapsGaps}
                      </div>
                    )}
                    {auditResult.leadAudit.digitalAudit.websiteBookingGaps && (
                      <div style={{ fontSize: "12px", padding: "8px 12px", background: "var(--bg-secondary)", border: "1px solid var(--border-color-light)", borderRadius: "6px" }}>
                        <strong style={{ color: "var(--info)" }}>🌐 Website & Conversion:</strong> {auditResult.leadAudit.digitalAudit.websiteBookingGaps}
                      </div>
                    )}
                    {auditResult.leadAudit.digitalAudit.socialReputationGaps && (
                      <div style={{ fontSize: "12px", padding: "8px 12px", background: "var(--bg-secondary)", border: "1px solid var(--border-color-light)", borderRadius: "6px" }}>
                        <strong style={{ color: "var(--success)" }}>⭐ Reviews & Social Proof:</strong> {auditResult.leadAudit.digitalAudit.socialReputationGaps}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Generated Outreach Copy */}
              {auditResult.leadAudit.outreachChannels && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                    Gemini-Generated Tailored Outreach
                  </span>

                  {/* WhatsApp Message */}
                  {auditResult.leadAudit.outreachChannels.whatsapp && (
                    <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--success)", display: "flex", alignItems: "center", gap: "4px" }}>
                          <PhoneIcon size={12} /> WhatsApp Outreach Script
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(auditResult.leadAudit.outreachChannels.whatsapp, "wa")}
                          className="admin-btn admin-btn--secondary admin-btn--sm"
                          style={{ fontSize: "11px", padding: "3px 8px" }}
                        >
                          {copiedType === "wa" ? <CheckIcon size={12} color="var(--success)" /> : <CopyIcon size={12} />}
                          <span>{copiedType === "wa" ? "Copied!" : "Copy"}</span>
                        </button>
                      </div>
                      <p style={{ margin: 0, fontSize: "12px", color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>
                        {auditResult.leadAudit.outreachChannels.whatsapp}
                      </p>
                    </div>
                  )}

                  {/* Cold Email */}
                  {auditResult.leadAudit.outreachChannels.emailBody && (
                    <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-primary)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--accent-primary)", display: "flex", alignItems: "center", gap: "4px" }}>
                          <MailIcon size={12} /> Personalized Cold Email
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(`${auditResult.leadAudit.outreachChannels.emailSubject}\n\n${auditResult.leadAudit.outreachChannels.emailBody}`, "email")}
                          className="admin-btn admin-btn--secondary admin-btn--sm"
                          style={{ fontSize: "11px", padding: "3px 8px" }}
                        >
                          {copiedType === "email" ? <CheckIcon size={12} color="var(--success)" /> : <CopyIcon size={12} />}
                          <span>{copiedType === "email" ? "Copied!" : "Copy"}</span>
                        </button>
                      </div>
                      {auditResult.leadAudit.outreachChannels.emailSubject && (
                        <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
                          Subject: {auditResult.leadAudit.outreachChannels.emailSubject}
                        </div>
                      )}
                      <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
                        {auditResult.leadAudit.outreachChannels.emailBody}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Live Gemini Diagnostic Benchmarking & Raw Inspector */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Live Latency & Prompt Ping Tester */}
          <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <TerminalIcon size={18} color="var(--accent-primary)" />
                <h3 style={{ fontSize: "16px", fontWeight: "800", color: "var(--text-primary)", margin: 0 }}>
                  Live API Latency & Prompt Tester
                </h3>
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px", margin: 0 }}>
                Directly ping Google's Generative Language servers to test response latency, token consumption, and model availability.
              </p>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px" }}>
                Test Prompt String
              </label>
              <textarea
                className="admin-input"
                rows={2}
                style={{ width: "100%", resize: "vertical" }}
                value={pingPrompt}
                onChange={(e) => setPingPrompt(e.target.value)}
              />
            </div>

            <button
              onClick={handleRunPing}
              disabled={pingLoading}
              className="admin-btn admin-btn--secondary"
              style={{ justifyContent: "center", padding: "9px 14px", fontWeight: "700" }}
            >
              <ZapIcon size={14} color="var(--accent-primary)" />
              <span>{pingLoading ? "Pinging Google Generative Language..." : "Execute Live Gemini Ping"}</span>
            </button>

            {pingError && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--danger)",
                  fontSize: "12px"
                }}
              >
                <strong>Error ({pingError.statusCode || 500}):</strong> {pingError.error}
              </div>
            )}

            {pingResult && (
              <div style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-color-light)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--success)", display: "flex", alignItems: "center", gap: "4px" }}>
                    ● 200 OK Response
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--accent-primary)", fontWeight: "700" }}>
                    ⏱ {pingResult.latencyMs} ms
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--text-primary)", fontStyle: "italic" }}>
                  "{pingResult.response}"
                </p>
                {pingResult.usageMetadata && (
                  <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid var(--border-color-light)", display: "flex", gap: "10px", fontSize: "11px", color: "var(--text-muted)" }}>
                    <span>Tokens: {pingResult.usageMetadata.totalTokenCount || 0}</span>
                    <span>•</span>
                    <span>Prompt: {pingResult.usageMetadata.promptTokenCount || 0}</span>
                    <span>•</span>
                    <span>Candidate: {pingResult.usageMetadata.candidatesTokenCount || 0}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Model Specification Card */}
          <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
              Gemini Integration Specifications
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border-color-light)" }}>
                <span style={{ color: "var(--text-secondary)" }}>API Endpoint:</span>
                <code style={{ color: "var(--text-primary)" }}>/models/gemini-3.6-flash:generateContent</code>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border-color-light)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Output Format:</span>
                <span style={{ fontWeight: "600", color: "var(--accent-primary)" }}>Structured JSON Schema</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border-color-light)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Primary Use Case:</span>
                <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>Autonomous Lead Enrichment & Deep Audit</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                <span style={{ color: "var(--text-secondary)" }}>Access Scope:</span>
                <span style={{ fontWeight: "700", color: "var(--success)" }}>Administrator Role Only</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminGeminiLive;
