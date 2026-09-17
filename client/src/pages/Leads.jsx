import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  getLeads,
  createLead,
  deleteLead as deleteLeadApi,
  deleteBatchLeads,
  importCSVLeads,
  analyzeLead,
  analyzeBatchLeads,
  enrichLead,
  enrichBatchLeads,
  bulkVerifyLeads,
  verifyLead
} from "../services/api";
import LeadTable from "../components/LeadTable";
import AiIntelligenceModal from "../components/AiIntelligenceModal";
import {
  SearchIcon,
  UploadIcon,
  GlobeIcon,
  SparklesIcon,
  PlusIcon,
  Trash2Icon,
  TriangleAlertIcon,
  CheckIcon,
  InfoIcon,
  FolderXIcon,
  ShieldCheckIcon,
  DownloadIcon
} from "@animateicons/react/lucide";
import AnimatedEmoji from "../components/AnimatedEmoji";

const TARGET_FIELDS = [
  {
    key: "companyName",
    label: "Company Name",
    required: true,
    aliases: [/company/i, /business/i, /organization/i, /org/i, /firm/i, /practice/i, /clinic/i, /center/i, /hospital/i, /account/i, /client/i]
  },
  {
    key: "contactName",
    label: "Contact Person",
    required: false,
    aliases: [/contact/i, /person/i, /full.*name/i, /lead.*name/i, /doctor/i, /dr\b/i, /dentist/i, /physician/i, /representative/i, /owner/i, /first.*name/i]
  },
  {
    key: "email",
    label: "Email Address",
    required: false,
    aliases: [/email/i, /e-mail/i, /mail/i]
  },
  {
    key: "phone",
    label: "Phone / Mobile",
    required: false,
    aliases: [/phone/i, /mobile/i, /tel/i, /cell/i, /contact.*no/i, /number/i, /whatsapp/i]
  },
  {
    key: "website",
    label: "Website / URL",
    required: false,
    aliases: [/web/i, /site/i, /url/i, /domain/i, /link/i]
  },
  {
    key: "industry",
    label: "Industry / Category",
    required: false,
    aliases: [/industry/i, /sector/i, /category/i, /niche/i, /specialty/i, /type/i]
  },
  {
    key: "location",
    label: "Location / Address",
    required: false,
    aliases: [/location/i, /city/i, /address/i, /country/i, /state/i, /region/i, /place/i, /street/i]
  },
  {
    key: "notes",
    label: "Notes / Pitch / Details",
    required: false,
    aliases: [/note/i, /pitch/i, /comment/i, /remark/i, /desc/i, /about/i, /info/i, /audit/i]
  }
];

const autoDetectFieldMappings = (headers, rows) => {
  const initialMapping = {
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    website: "",
    industry: "",
    location: "",
    notes: ""
  };
  const usedHeaders = new Set();
  const sampleRows = rows.slice(0, 15);

  const getSamples = (h) =>
    sampleRows
      .map((r) => String(r[h] !== undefined && r[h] !== null ? r[h] : "").trim())
      .filter(Boolean);

  // 1. Identify purely numeric index/id columns (#, ID, Row No, or values are just integers like 1, 2, 3 or 11, 12, 13)
  const indexCols = new Set();
  headers.forEach((h) => {
    const samples = getSamples(h);
    if (samples.length > 0) {
      const isPureNumbers = samples.every((s) => /^\d{1,6}$/.test(s));
      const hasIndexName = /^(#|no\.?|id|sr|index|num|s\.?no)$/i.test(h.trim());
      if (isPureNumbers || hasIndexName) {
        indexCols.add(h);
      }
    }
  });

  // PASS 1: Explicit header name matches (excluding generic Column 1, Column 2, etc. and index columns)
  TARGET_FIELDS.forEach((field) => {
    const matched = headers.find((h) => {
      if (usedHeaders.has(h)) return false;
      if (field.key === "companyName" && indexCols.has(h)) return false;
      const clean = h.trim();
      if (/^(column\s*\d+|field\s*\d+|__empty)/i.test(clean)) return false;
      return field.aliases.some((rgx) => rgx.test(clean));
    });

    if (matched) {
      initialMapping[field.key] = matched;
      usedHeaders.add(matched);
    }
  });

  // PASS 2: Deep Content-Aware Data Pattern Detection
  const remainingHeaders = headers.filter((h) => !usedHeaders.has(h));

  // A. Phone Number detection
  if (!initialMapping.phone) {
    const phoneMatch = remainingHeaders.find((h) => {
      const samples = getSamples(h);
      if (samples.length === 0) return false;
      const matchCount = samples.filter((s) =>
        /^\+?[\d\s\-().]{8,22}$/.test(s) && (s.match(/\d/g) || []).length >= 7
      ).length;
      return matchCount >= Math.ceil(samples.length * 0.4);
    });
    if (phoneMatch) {
      initialMapping.phone = phoneMatch;
      usedHeaders.add(phoneMatch);
    }
  }

  // B. Email detection
  if (!initialMapping.email) {
    const emailMatch = headers.find((h) => {
      if (usedHeaders.has(h)) return false;
      const samples = getSamples(h);
      if (samples.length === 0) return false;
      const matchCount = samples.filter((s) =>
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(s)
      ).length;
      return matchCount >= Math.ceil(samples.length * 0.3);
    });
    if (emailMatch) {
      initialMapping.email = emailMatch;
      usedHeaders.add(emailMatch);
    }
  }

  // C. Website / URL detection
  if (!initialMapping.website) {
    const webMatch = headers.find((h) => {
      if (usedHeaders.has(h)) return false;
      const samples = getSamples(h);
      if (samples.length === 0) return false;
      const matchCount = samples.filter((s) =>
        /^(https?:\/\/|www\.)|(\.[a-z]{2,8}(\/.*)?$)/i.test(s) && !s.includes("@")
      ).length;
      return matchCount >= Math.ceil(samples.length * 0.3);
    });
    if (webMatch) {
      initialMapping.website = webMatch;
      usedHeaders.add(webMatch);
    }
  }

  // D. Contact Name (Starts with Dr., Mr., or personal names)
  if (!initialMapping.contactName) {
    const contactMatch = headers.find((h) => {
      if (usedHeaders.has(h)) return false;
      if (indexCols.has(h)) return false;
      const samples = getSamples(h);
      if (samples.length === 0) return false;
      const matchCount = samples.filter((s) =>
        /^(Dr\.?|Doctor|Mr\.?|Mrs\.?|Ms\.?|Prof\.?)\s+[A-Za-z]/i.test(s) ||
        (/^[A-Z][a-z]+(\s+[A-Z][a-z]+){1,2}$/.test(s) && !/\b(LLC|Inc|Corp|Dental|Clinic|Office|Care|Group)\b/i.test(s))
      ).length;
      return matchCount >= Math.ceil(samples.length * 0.4);
    });
    if (contactMatch) {
      initialMapping.contactName = contactMatch;
      usedHeaders.add(contactMatch);
    }
  }

  // E. Location (Full address with street names / zip codes)
  if (!initialMapping.location) {
    const locMatch = headers.find((h) => {
      if (usedHeaders.has(h)) return false;
      if (indexCols.has(h)) return false;
      const samples = getSamples(h);
      if (samples.length === 0) return false;
      const matchCount = samples.filter((s) =>
        /\b(st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|way|ln|lane|hwy|pkwy|suite|ste|bldg|#\d+)\b/i.test(s) ||
        /\b[A-Z]{2}\s+\d{5}\b/.test(s)
      ).length;
      return matchCount >= Math.ceil(samples.length * 0.4);
    });
    if (locMatch) {
      initialMapping.location = locMatch;
      usedHeaders.add(locMatch);
    }
  }

  // F. Industry / Category (medical, dental, cosmetic, etc.)
  if (!initialMapping.industry) {
    const indMatch = headers.find((h) => {
      if (usedHeaders.has(h)) return false;
      if (indexCols.has(h)) return false;
      const samples = getSamples(h);
      if (samples.length === 0) return false;
      const matchCount = samples.filter((s) =>
        /\b(dentistry|dental|orthodontics|implant|cosmetic|family|medical|health|clinic|surgery|consulting|marketing|agency|software)\b/i.test(s)
      ).length;
      return matchCount >= Math.ceil(samples.length * 0.3);
    });
    if (indMatch) {
      initialMapping.industry = indMatch;
      usedHeaders.add(indMatch);
    }
  }

  // G. Company Name (Business names with suffixes or primary text column)
  if (!initialMapping.companyName) {
    // Look for business suffixes
    const bizMatch = headers.find((h) => {
      if (usedHeaders.has(h)) return false;
      if (indexCols.has(h)) return false;
      const samples = getSamples(h);
      if (samples.length === 0) return false;
      const matchCount = samples.filter((s) =>
        /\b(dds|dmd|dental|clinic|office|group|care|center|associates|corp|inc|llc|co|hospital|practice)\b/i.test(s)
      ).length;
      return matchCount >= Math.ceil(samples.length * 0.3);
    });

    if (bizMatch) {
      initialMapping.companyName = bizMatch;
      usedHeaders.add(bizMatch);
    } else {
      // Pick first non-numeric, non-index text column
      const fallback = headers.find((h) => !usedHeaders.has(h) && !indexCols.has(h));
      if (fallback) {
        initialMapping.companyName = fallback;
        usedHeaders.add(fallback);
      } else if (headers.length > 0) {
        initialMapping.companyName = headers[0];
      }
    }
  }

  // H. Notes / Pitch / Details (long descriptive sentences)
  if (!initialMapping.notes) {
    const notesMatch = headers.find((h) => {
      if (usedHeaders.has(h)) return false;
      if (indexCols.has(h)) return false;
      const samples = getSamples(h);
      if (samples.length === 0) return false;
      const matchCount = samples.filter((s) => s.length > 25).length;
      return matchCount >= Math.ceil(samples.length * 0.3);
    });
    if (notesMatch) {
      initialMapping.notes = notesMatch;
      usedHeaders.add(notesMatch);
    }
  }

  return initialMapping;
};

const Leads = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [verificationFilter, setVerificationFilter] = useState("");
  const [importResult, setImportResult] = useState(null);

  // Add Manual Lead Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [newLead, setNewLead] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    website: "",
    industry: "",
    location: ""
  });

  // Dynamic Spreadsheet Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState("upload"); // 'upload' | 'map'
  const [rawRows, setRawRows] = useState([]);
  const [fileHeaders, setFileHeaders] = useState([]);
  const [fieldMappings, setFieldMappings] = useState({});
  const [importedFileName, setImportedFileName] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchLeads();
  }, [search, statusFilter, verificationFilter]);

  const fetchLeads = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (verificationFilter) params.verificationStatus = verificationFilter;

      const { data } = await getLeads(params);
      setLeads(data.leads);
      setCounts(data.counts);
    } catch (err) {
      console.error("Failed to fetch leads:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLead = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    try {
      await createLead(newLead);
      setShowAddModal(false);
      setNewLead({
        companyName: "",
        contactName: "",
        email: "",
        phone: "",
        website: "",
        industry: "",
        location: ""
      });
      fetchLeads();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to add lead");
    } finally {
      setFormLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Lead Selection & Deletion Handlers
  // -------------------------------------------------------------
  const [selectedIds, setSelectedIds] = useState([]);

  const handleToggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === leads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map(l => l._id));
    }
  };

  const handleDeleteLead = async (id) => {
    try {
      await deleteLeadApi(id);
      setSelectedIds(prev => prev.filter(item => item !== id));
      await fetchLeads();
      setAiNotice("🗑️ Lead deleted successfully.");
      setTimeout(() => setAiNotice(""), 2500);
    } catch (err) {
      setAiNotice("❌ Failed to delete lead: " + (err.response?.data?.message || err.message));
      setTimeout(() => setAiNotice(""), 3000);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      const { data } = await deleteBatchLeads({ leadIds: selectedIds });
      setSelectedIds([]);
      await fetchLeads();
      setAiNotice(`🗑️ ${data.message || "Selected leads deleted."}`);
      setTimeout(() => setAiNotice(""), 2500);
    } catch (err) {
      setAiNotice("❌ " + (err.response?.data?.message || err.message));
      setTimeout(() => setAiNotice(""), 3000);
    }
  };

  const handleDeleteAll = async () => {
    if (leads.length === 0) return;
    try {
      const { data } = await deleteBatchLeads({ all: true });
      setSelectedIds([]);
      await fetchLeads();
      showNotice("All leads deleted successfully.", "info", 2500);
    } catch (err) {
      showNotice("Failed to delete: " + (err.response?.data?.message || err.message), "warning", 3000);
    }
  };

  // -------------------------------------------------------------
  // AI Lead Analysis Handlers & Intelligence Modal
  // -------------------------------------------------------------
  const [analyzing, setAnalyzing] = useState(false);
  const [aiNotice, setAiNotice] = useState(null); // { text, type: 'success'|'warning'|'info' }
  const [activeAiLead, setActiveAiLead] = useState(null);
  const [activeAiResult, setActiveAiResult] = useState(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [analyzingLeadId, setAnalyzingLeadId] = useState(null);

  const showNotice = (text, type = "success", duration = 4500) => {
    setAiNotice({ text, type });
    if (duration > 0) {
      setTimeout(() => setAiNotice(null), duration);
    }
  };

  const handleAnalyzeSingle = async (leadOrId) => {
    // If lead already has intelligence, open modal immediately
    if (typeof leadOrId === "object" && leadOrId.aiAnalysis) {
      let parsed = null;
      try {
        parsed = typeof leadOrId.aiAnalysis === "string" ? JSON.parse(leadOrId.aiAnalysis) : leadOrId.aiAnalysis;
      } catch {
        parsed = null;
      }
      setActiveAiLead(leadOrId);
      setActiveAiResult(parsed);
      setShowAiModal(true);
      return;
    }

    const leadId = typeof leadOrId === "object" ? leadOrId._id : leadOrId;
    setAnalyzingLeadId(leadId);
    showNotice("Gemini AI is extracting deep business intelligence...", "info", 0);

    try {
      const { data } = await analyzeLead(leadId);
      await fetchLeads();
      setActiveAiLead(data.lead);
      setActiveAiResult(data.aiResult);
      setShowAiModal(true);
      showNotice(data.message || `Full intelligence analysis complete for ${data.lead.companyName}! (-98 credits)`, "success", 4000);
    } catch (err) {
      showNotice("AI Analysis Error: " + (err.response?.data?.message || err.message), "warning", 6000);
    } finally {
      setAnalyzingLeadId(null);
    }
  };

  const handleReAnalyzeSingle = async (leadId) => {
    setAnalyzingLeadId(leadId);
    try {
      const { data } = await analyzeLead(leadId);
      await fetchLeads();
      setActiveAiLead(data.lead);
      setActiveAiResult(data.aiResult);
      showNotice(data.message || `Intelligence updated for ${data.lead.companyName}! (-98 credits)`, "success", 4000);
    } catch (err) {
      showNotice("AI Analysis Error: " + (err.response?.data?.message || err.message), "warning", 6000);
    } finally {
      setAnalyzingLeadId(null);
    }
  };

  const handleAnalyzeBatch = async () => {
    if (analyzing) return;
    if (selectedIds.length > 0) {
      return handleAnalyzeSelected();
    }
    setAnalyzing(true);
    showNotice("AI is analyzing unanalyzed leads (98 credits per lead)...", "info", 0);
    try {
      const { data } = await analyzeBatchLeads({ limit: 10 });
      await fetchLeads();
      if (data.leads && data.leads.length > 0) {
        const firstLead = data.leads[0];
        let parsed = null;
        try {
          parsed = typeof firstLead.aiAnalysis === "string" ? JSON.parse(firstLead.aiAnalysis) : firstLead.aiAnalysis;
        } catch {
          parsed = null;
        }
        setActiveAiLead(firstLead);
        setActiveAiResult(parsed);
        setShowAiModal(true);
      }
      showNotice(data.message || "Batch analysis completed!", "success", 4500);
    } catch (err) {
      showNotice("Batch AI Analysis Error: " + (err.response?.data?.message || err.message), "warning", 6000);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyzeSelected = async () => {
    if (analyzing || selectedIds.length === 0) return;
    setAnalyzing(true);
    showNotice(`AI is analyzing ${selectedIds.length} selected lead(s) (${selectedIds.length * 98} credits total)...`, "info", 0);
    try {
      const { data } = await analyzeBatchLeads({ leadIds: selectedIds });
      await fetchLeads();
      setSelectedIds([]);
      if (data.leads && data.leads.length > 0) {
        const firstLead = data.leads[0];
        let parsed = null;
        try {
          parsed = typeof firstLead.aiAnalysis === "string" ? JSON.parse(firstLead.aiAnalysis) : firstLead.aiAnalysis;
        } catch {
          parsed = null;
        }
        setActiveAiLead(firstLead);
        setActiveAiResult(parsed);
        setShowAiModal(true);
      }
      showNotice(data.message || "Selected leads analyzed successfully!", "success", 4500);
    } catch (err) {
      showNotice("AI Analysis Error: " + (err.response?.data?.message || err.message), "warning", 6000);
    } finally {
      setAnalyzing(false);
    }
  };

  const [enriching, setEnriching] = useState(false);

  const handleEnrichBatch = async () => {
    if (enriching) return;
    setEnriching(true);
    showNotice("Searching live web & Google Maps for real phone numbers, websites, and emails...", "info", 0);
    try {
      const { data } = await enrichBatchLeads({ limit: 10 });
      await fetchLeads();
      if (!data.enrichedCount || data.enrichedCount === 0) {
        showNotice(data.message || "Oops! No more information found from Google or web searches.", "warning", 5000);
      } else {
        showNotice(data.message || `Successfully enriched ${data.enrichedCount} lead(s) with real web data!`, "success", 5000);
      }
    } catch (err) {
      alert("Enrichment Error: " + (err.response?.data?.message || err.message));
      setAiNotice(null);
    } finally {
      setEnriching(false);
    }
  };

  const handleEnrichSelected = async () => {
    if (enriching || selectedIds.length === 0) return;
    setEnriching(true);
    showNotice(`Searching live web & Google Maps for ${selectedIds.length} selected lead(s)...`, "info", 0);
    try {
      const { data } = await enrichBatchLeads({ leadIds: selectedIds });
      await fetchLeads();
      if (!data.enrichedCount || data.enrichedCount === 0) {
        showNotice(data.message || "Oops! No more information found from Google or web searches.", "warning", 5000);
      } else {
        showNotice(data.message || `Selected leads enriched with real web data!`, "success", 5000);
      }
    } catch (err) {
      alert("Enrichment Error: " + (err.response?.data?.message || err.message));
      setAiNotice(null);
    } finally {
      setEnriching(false);
    }
  };

  const [verifying, setVerifying] = useState(false);

  const handleVerifySelected = async () => {
    if (verifying || selectedIds.length === 0) return;
    setVerifying(true);
    showNotice(`Verifying facts and live web presence for ${selectedIds.length} lead(s)...`, "info", 0);
    try {
      const { data } = await bulkVerifyLeads(selectedIds);
      await fetchLeads();
      showNotice(data.message || `Verification completed for ${selectedIds.length} lead(s)!`, "success", 4500);
    } catch (err) {
      alert("Verification Error: " + (err.response?.data?.message || err.message));
      setAiNotice(null);
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyImported = async () => {
    if (!importResult?.leadIds || importResult.leadIds.length === 0) return;
    const targetIds = importResult.leadIds;
    setImportResult(null);
    setVerifying(true);
    showNotice(`Verifying ${targetIds.length} freshly imported lead(s)...`, "info", 0);
    try {
      const { data } = await bulkVerifyLeads(targetIds);
      await fetchLeads();
      showNotice(data.message || `Verified ${targetIds.length} imported leads!`, "success", 4500);
    } catch (err) {
      alert("Verification Error: " + (err.response?.data?.message || err.message));
      setAiNotice(null);
    } finally {
      setVerifying(false);
    }
  };

  // -------------------------------------------------------------
  // Excel Export Feature (.xlsx)
  // -------------------------------------------------------------
  const exportToExcel = (leadsToExport, customFileName) => {
    if (!leadsToExport || leadsToExport.length === 0) {
      alert("No leads available to export.");
      return;
    }

    // Collect all dynamic custom field keys across all leads
    const customKeys = [];
    const seenKeys = new Set();
    leadsToExport.forEach((lead) => {
      if (lead.customFields && typeof lead.customFields === "object") {
        Object.keys(lead.customFields).forEach((key) => {
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            customKeys.push(key);
          }
        });
      }
    });

    const rows = leadsToExport.map((lead) => {
      const verStatus = lead.verification?.status
        ? lead.verification.status.replace(/_/g, " ").toUpperCase()
        : "UNVERIFIED";

      const verScore =
        lead.verification?.score !== undefined ? `${lead.verification.score}%` : "0%";

      const baseRow = {
        "Company Name": lead.companyName || "",
        "Contact Person": lead.contactName || "",
        "Email Address": lead.email || "",
        "Phone Number": lead.phone || "",
        "Website": lead.website || "",
        "Location / City": lead.location || "",
        "Industry": lead.industry || "",
        "Status": (lead.status || "new").toUpperCase(),
        "Verification Status": verStatus,
        "Trust Score": verScore,
        "AI Score": lead.score !== undefined ? lead.score : "",
        "Completeness": lead.completenessStatus === "incomplete" ? "Incomplete" : "Complete",
        "Source": lead.source || "spreadsheet",
        "Notes": lead.notes || "",
        "AI Summary": lead.aiAnalysis || "",
        "AI Outreach Pitch": lead.aiMessage || ""
      };

      // Append all custom columns dynamically
      customKeys.forEach((k) => {
        baseRow[k] =
          lead.customFields?.[k] !== undefined && lead.customFields?.[k] !== null
            ? lead.customFields[k]
            : "";
      });

      return baseRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto-compute column widths
    const columnKeys = Object.keys(rows[0] || {});
    const colWidths = columnKeys.map((key) => {
      let maxLen = key.length;
      rows.forEach((r) => {
        const val = r[key] !== undefined && r[key] !== null ? String(r[key]) : "";
        if (val.length > maxLen) {
          maxLen = Math.min(val.length, 50);
        }
      });
      return { wch: Math.max(maxLen + 3, 12) };
    });
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Updated Leads");

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName =
      customFileName ||
      (importedFileName
        ? `${importedFileName.replace(/\.[^/.]+$/, "")}_updated_${dateStr}.xlsx`
        : `leads_updated_${dateStr}.xlsx`);

    try {
      if (typeof XLSX.writeFile === "function") {
        XLSX.writeFile(workbook, fileName);
      } else {
        const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blob = new Blob([wbout], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      showNotice(
        `Exported ${leadsToExport.length} updated lead(s) to "${fileName}"!`,
        "success",
        4500
      );
    } catch (exportErr) {
      console.error("Export error:", exportErr);
      alert("Failed to export Excel file: " + exportErr.message);
    }
  };

  const handleExportAll = () => {
    exportToExcel(leads);
  };

  const handleExportSelected = () => {
    if (selectedIds.length === 0) return;
    const selectedLeads = leads.filter((l) => selectedIds.includes(l._id));
    const dateStr = new Date().toISOString().slice(0, 10);
    exportToExcel(
      selectedLeads,
      `leads_selected_${selectedLeads.length}_${dateStr}.xlsx`
    );
  };

  // -------------------------------------------------------------
  // Smart File Parser (CSV, XLSX, XLS)
  // -------------------------------------------------------------
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFormLoading(true);
    setFormError("");
    setImportedFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (!jsonRows || jsonRows.length === 0) {
        setFormError("The selected spreadsheet is empty.");
        setFormLoading(false);
        return;
      }

      // Extract all header columns
      const headers = Object.keys(jsonRows[0]).filter(h => h && h.trim());
      if (headers.length === 0) {
        setFormError("No column headers found in spreadsheet.");
        setFormLoading(false);
        return;
      }

      setFileHeaders(headers);
      setRawRows(jsonRows);

      // Auto-detect & map fields using intelligent regex aliases and deep content inspection
      const initialMapping = autoDetectFieldMappings(headers, jsonRows);
      setFieldMappings(initialMapping);
      setImportStep("map");
    } catch (err) {
      setFormError("Failed to read file: " + (err.message || "Invalid format"));
    } finally {
      setFormLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleMappingChange = (targetKey, selectedHeader) => {
    setFieldMappings(prev => ({
      ...prev,
      [targetKey]: selectedHeader
    }));
  };

  const handleConfirmImport = async () => {
    setFormLoading(true);
    setFormError("");

    try {
      const mappedLeads = rawRows.map((row, index) => {
        const lead = {};

        // Map target fields
        TARGET_FIELDS.forEach(f => {
          const mappedHeader = fieldMappings[f.key];
          if (mappedHeader && row[mappedHeader] !== undefined) {
            lead[f.key] = String(row[mappedHeader]).trim();
          }
        });

        // Ensure companyName fallback
        if (!lead.companyName) {
          lead.companyName = `Lead #${index + 1}`;
        }

        // Grab all other dynamic columns as customFields
        const mappedHeaderValues = new Set(Object.values(fieldMappings).filter(Boolean));
        const customFields = {};
        for (const [col, val] of Object.entries(row)) {
          if (!mappedHeaderValues.has(col) && val !== undefined && val !== null && val !== "") {
            customFields[col] = val;
          }
        }
        lead.customFields = customFields;

        return lead;
      });

      const { data } = await importCSVLeads(mappedLeads, importedFileName);
      setShowImportModal(false);
      setImportStep("upload");
      setRawRows([]);
      fetchLeads();
      window.dispatchEvent(new CustomEvent("scrapsUpdated"));

      setImportResult({
        total: data.total || mappedLeads.length,
        cleanCount: data.cleanCount !== undefined ? data.cleanCount : mappedLeads.length,
        incompleteCount: data.incompleteCount || 0,
        scrapCount: data.scrapCount || 0,
        fileName: importedFileName || "Spreadsheet",
        leadIds: data.leadIds || []
      });
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to import leads");
    } finally {
      setFormLoading(false);
    }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportStep("upload");
    setRawRows([]);
    setFormError("");
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Loading leads...</p>
      </div>
    );
  }

  return (
    <div className="leads-page">
      <div className="page-header" style={{ marginBottom: "20px", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "700", letterSpacing: "-0.02em" }}>Leads</h1>
          <span
            style={{
              fontSize: "12px",
              fontWeight: "600",
              padding: "2px 10px",
              background: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
              borderRadius: "12px",
              border: "1px solid var(--border-color-light)"
            }}
          >
            {counts.total || leads.length} total
          </span>
        </div>

        <div className="page-header__actions" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button
            className="btn btn--ghost"
            onClick={() => setShowImportModal(true)}
            style={{ fontSize: "13px", padding: "7px 12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            title="Upload spreadsheet (Excel or CSV)"
          >
            <UploadIcon size={14} />
            <span>Import Sheet</span>
          </button>
          <button
            className="btn btn--ghost"
            onClick={handleExportAll}
            disabled={leads.length === 0}
            style={{
              fontSize: "13px",
              padding: "7px 12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              borderColor: "rgba(16, 185, 129, 0.4)",
              color: "#059669",
              background: "rgba(16, 185, 129, 0.05)"
            }}
            title="Download current leads with updated/verified data as Excel (.xlsx)"
          >
            <DownloadIcon size={14} />
            <span>Export Sheet</span>
          </button>
          <button
            className="btn btn--ghost"
            onClick={handleEnrichBatch}
            disabled={enriching}
            style={{
              fontSize: "13px",
              padding: "7px 12px",
              borderColor: "rgba(2, 132, 199, 0.35)",
              color: "#0369A1",
              background: "rgba(2, 132, 199, 0.05)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
            title="Search live web & Google Maps to automatically find missing phones, websites, and emails"
          >
            <GlobeIcon size={14} />
            <span>{enriching ? "Finding..." : "Auto-Find Contacts"}</span>
          </button>
          <button
            className="btn btn--primary"
            onClick={handleAnalyzeBatch}
            disabled={analyzing}
            style={{
              fontSize: "13px",
              padding: "7px 14px",
              background: "linear-gradient(135deg, #4F46E5, #6366F1)",
              boxShadow: "0 2px 8px rgba(79, 70, 229, 0.25)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
            title="Auto-analyze leads with Gemini AI (Costs 98 credits per lead from your 1,000 daily credits)"
          >
            <SparklesIcon size={14} />
            <span>{analyzing ? "Analyzing..." : "AI Analyze Leads (98 cr)"}</span>
          </button>
          <button
            className="btn btn--primary"
            onClick={() => setShowAddModal(true)}
            style={{ fontSize: "13px", padding: "7px 14px", display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <PlusIcon size={14} />
            <span>Add Lead</span>
          </button>
          {leads.length > 0 && (
            <button
              className="btn btn--ghost btn--danger"
              onClick={handleDeleteAll}
              title="Clear all leads in your account"
              style={{ fontSize: "12px", padding: "7px 9px", opacity: 0.75, display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              <Trash2Icon size={13} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {aiNotice && (
        <div
          className={`alert ${
            aiNotice.type === "warning"
              ? "alert--warning"
              : aiNotice.type === "info"
              ? "alert--info"
              : "alert--success"
          }`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "20px",
            fontWeight: "600",
            animation: "fadeIn 0.3s ease"
          }}
        >
          {aiNotice.type === "warning" && <TriangleAlertIcon size={16} color="#D97706" />}
          {aiNotice.type === "info" && <SearchIcon size={16} color="#2563EB" />}
          {aiNotice.type === "success" && <CheckIcon size={16} color="#16A34A" />}
          <span>{aiNotice.text}</span>
        </div>
      )}

      {/* Floating Selection Toolbar when rows are checked */}
      {selectedIds.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--accent-light)",
            border: "1px solid rgba(79, 70, 229, 0.25)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 18px",
            marginBottom: "18px",
            flexWrap: "wrap",
            gap: "10px",
            animation: "fadeIn 0.2s ease"
          }}
        >
          <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--accent-primary)" }}>
            ✓ <strong>{selectedIds.length}</strong> of {leads.length} leads selected
          </span>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              className="btn btn--sm btn--ghost"
              onClick={handleVerifySelected}
              disabled={verifying}
              style={{
                borderColor: "rgba(79, 70, 229, 0.4)",
                color: "var(--accent-primary)",
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px"
              }}
            >
              <ShieldCheckIcon size={13} />
              <span>{verifying ? "Verifying..." : `Verify (${selectedIds.length})`}</span>
            </button>
            <button
              className="btn btn--sm btn--ghost"
              onClick={handleEnrichSelected}
              disabled={enriching}
              style={{
                borderColor: "rgba(2, 132, 199, 0.5)",
                color: "#0284C7",
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px"
              }}
              title={`Find real contact details with AI Web search (${selectedIds.length * 98} credits total)`}
            >
              <GlobeIcon size={13} />
              <span>{enriching ? "Finding..." : `Find Contacts (${selectedIds.length}) · ${selectedIds.length * 98} cr`}</span>
            </button>
            <button
              className="btn btn--sm btn--primary"
              onClick={handleAnalyzeSelected}
              disabled={analyzing}
              style={{
                background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px"
              }}
              title={`Analyze ${selectedIds.length} lead(s) with AI (${selectedIds.length * 98} credits total)`}
            >
              <SparklesIcon size={13} />
              <span>AI Analyze ({selectedIds.length}) · {selectedIds.length * 98} cr</span>
            </button>
            <button
              className="btn btn--sm btn--ghost"
              onClick={handleExportSelected}
              style={{
                borderColor: "rgba(16, 185, 129, 0.4)",
                color: "#059669",
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px"
              }}
              title="Export selected leads to Excel (.xlsx)"
            >
              <DownloadIcon size={13} />
              <span>Export ({selectedIds.length})</span>
            </button>
            <button
              className="btn btn--sm btn--danger"
              onClick={handleDeleteSelected}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
            >
              <Trash2Icon size={13} />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
            <button
              className="btn btn--sm btn--ghost"
              onClick={() => setSelectedIds([])}
            >
              ✕ Deselect
            </button>
          </div>
        </div>
      )}

      <div className="leads-filters" style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <div className="search-box" style={{ maxWidth: "340px", position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              pointerEvents: "none"
            }}
          >
            <SearchIcon size={15} />
          </span>
          <input
            type="text"
            placeholder="Search company, contact, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ height: "38px", fontSize: "13px", paddingLeft: "34px" }}
          />
        </div>

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ height: "38px", fontSize: "13px", width: "150px" }}
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
          className="filter-select"
          value={verificationFilter}
          onChange={(e) => setVerificationFilter(e.target.value)}
          style={{ height: "38px", fontSize: "13px", width: "180px" }}
        >
          <option value="">All Verifications</option>
          <option value="high_confidence">🛡️ High Confidence (90-100)</option>
          <option value="verified">✅ Verified (70-89)</option>
          <option value="partially_verified">⚡ Partially Verified (40-69)</option>
          <option value="unverified">⚪ Unverified (0-39)</option>
          <option value="needs_review">⚠️ Needs Review</option>
        </select>
      </div>

      <LeadTable
        leads={leads}
        selectedIds={selectedIds}
        analyzingLeadId={analyzingLeadId}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onDelete={handleDeleteLead}
        onAnalyze={handleAnalyzeSingle}
      />

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Add New Lead</h2>
              <button
                className="modal__close"
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="alert alert--danger">{formError}</div>
            )}

            <form onSubmit={handleAddLead} className="modal__form">
              <div className="form-row">
                <div className="form-group">
                  <label>Company Name *</label>
                  <input
                    type="text"
                    placeholder="ABC Industries"
                    value={newLead.companyName}
                    onChange={(e) => setNewLead({ ...newLead, companyName: e.target.value })}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>Contact Name</label>
                  <input
                    type="text"
                    placeholder="Rahul Sharma"
                    value={newLead.contactName}
                    onChange={(e) => setNewLead({ ...newLead, contactName: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="contact@abc.com"
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    placeholder="+91XXXXXXXXXX"
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Website</label>
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={newLead.website}
                    onChange={(e) => setNewLead({ ...newLead, website: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Industry</label>
                  <input
                    type="text"
                    placeholder="Textile, IT, Pharma..."
                    value={newLead.industry}
                    onChange={(e) => setNewLead({ ...newLead, industry: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  placeholder="Ahmedabad, Mumbai..."
                  value={newLead.location}
                  onChange={(e) => setNewLead({ ...newLead, location: e.target.value })}
                />
              </div>

              <div className="modal__actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={formLoading}
                >
                  {formLoading ? "Adding..." : "Add Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Spreadsheet Import Modal (CSV & Excel) */}
      {showImportModal && (
        <div className="modal-overlay" onClick={closeImportModal}>
          <div
            className={`modal ${importStep === "map" ? "modal--lg" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal__header">
              <h2>
                {importStep === "upload"
                  ? "📥 Import Leads from Spreadsheet"
                  : `🎯 Map Columns: ${importedFileName}`}
              </h2>
              <button
                className="modal__close"
                onClick={closeImportModal}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal__body">
              {formError && (
                <div className="alert alert--danger">{formError}</div>
              )}

              {importStep === "upload" ? (
                <>
                  <p className="import-info">
                    Upload any Excel (<strong>.xlsx</strong>, <strong>.xls</strong>) or <strong>.csv</strong> file.
                    Columns are automatically matched to fields, and any extra columns are saved as custom fields!
                  </p>

                  <div className="import-dropzone" style={{ marginTop: "16px" }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                      onChange={handleFileSelect}
                      id="spreadsheet-upload"
                      hidden
                    />
                    <label htmlFor="spreadsheet-upload" className="import-dropzone__label">
                      <span className="import-dropzone__icon">
                        <AnimatedEmoji emoji="📊" size={36} />
                      </span>
                      <span>Click to select Excel (.xlsx) or CSV file</span>
                      <span className="import-dropzone__hint">Supports any column names or order</span>
                    </label>
                  </div>

                  {formLoading && (
                    <div className="import-progress" style={{ marginTop: "16px", textAlign: "center" }}>
                      <div className="loading-spinner"></div>
                      <p style={{ marginTop: "8px" }}>Analyzing columns...</p>
                    </div>
                  )}
                </>
              ) : (
                /* Step 2: Column Matcher & Preview */
                <div className="column-mapper">
                  <div className="mapper-header-card">
                    <span className="badge badge--primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <AnimatedEmoji emoji="📄" size={15} />
                      <span><strong>{rawRows.length}</strong> rows detected in spreadsheet</span>
                    </span>
                    <button
                      className="btn btn--sm btn--ghost"
                      onClick={() => setImportStep("upload")}
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      <AnimatedEmoji emoji="🔄" size={14} />
                      <span>Upload different file</span>
                    </button>
                  </div>

                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "14px" }}>
                    We automatically detected your spreadsheet columns. Confirm or adjust which column maps to which field:
                  </p>

                  <div className="mapper-grid">
                    {TARGET_FIELDS.map(field => (
                      <div className="mapper-field-row" key={field.key}>
                        <div className="mapper-field-label">
                          <span>{field.label}</span>
                          {field.required && <span className="mapper-required">*</span>}
                        </div>
                        <select
                          value={fieldMappings[field.key] || ""}
                          onChange={e => handleMappingChange(field.key, e.target.value)}
                          className="mapper-select"
                        >
                          <option value="">— Skip / Custom Field —</option>
                          {fileHeaders.map(header => {
                            const sampleVal = rawRows.find(
                              r => r[header] !== undefined && r[header] !== null && String(r[header]).trim() !== ""
                            )?.[header];
                            const sampleSnippet = sampleVal
                              ? ` (e.g. "${String(sampleVal).slice(0, 24)}${String(sampleVal).length > 24 ? "..." : ""}")`
                              : "";
                            return (
                              <option key={header} value={header}>
                                {header}{sampleSnippet}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="mapper-notice" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <AnimatedEmoji emoji="💡" size={18} />
                    <span><strong>Unmapped columns</strong> in your sheet will automatically be saved as dynamic custom fields for each lead.</span>
                  </div>

                  {/* Quick Preview Table (First 3 rows) */}
                  <div>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "6px" }}>
                      Preview (First 3 Rows)
                    </span>
                    <div style={{ overflowX: "auto", border: "1px solid var(--border-primary)", borderRadius: "var(--radius-sm)" }}>
                      <table className="mapper-preview-table">
                        <thead>
                          <tr>
                            <th>Company</th>
                            <th>Contact</th>
                            <th>Phone</th>
                            <th>Location</th>
                            <th>Industry</th>
                            <th>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rawRows.slice(0, 3).map((r, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: "600", color: "var(--text-primary)" }}>
                                {r[fieldMappings.companyName] || `Lead #${i + 1}`}
                              </td>
                              <td>{r[fieldMappings.contactName] || "—"}</td>
                              <td>{r[fieldMappings.phone] || "—"}</td>
                              <td>{r[fieldMappings.location] || "—"}</td>
                              <td>{r[fieldMappings.industry] || "—"}</td>
                              <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {r[fieldMappings.notes] || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal__actions">
              <button
                className="btn btn--ghost"
                onClick={closeImportModal}
              >
                Cancel
              </button>
              {importStep === "map" && (
                <button
                  className="btn btn--primary"
                  onClick={handleConfirmImport}
                  disabled={formLoading}
                >
                  {formLoading ? "Importing..." : `Confirm & Import ${rawRows.length} Leads`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quality Control Import Result Modal */}
      {importResult && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "580px", padding: "28px" }}>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "28px",
                  backgroundColor: importResult.scrapCount > 0 ? "#EEF2FF" : "#DCFCE7",
                  color: importResult.scrapCount > 0 ? "var(--accent-primary)" : "#16A34A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px auto"
                }}
              >
                <SparklesIcon size={28} />
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "6px" }}>
                Import & Quality Control Complete
              </h2>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                Spreadsheet <strong>"{importResult.fileName}"</strong> was processed.
              </p>
            </div>

            {/* Breakdown Cards: Total, Active Leads, Incomplete Leads, Scraps */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "20px" }}>
              {/* Total Rows */}
              <div
                style={{
                  padding: "14px 8px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "#F8FAFC",
                  border: "1px solid var(--border-color)",
                  textAlign: "center"
                }}
              >
                <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-primary)" }}>
                  {importResult.total}
                </div>
                <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Total Rows
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Uploaded
                </div>
              </div>

              {/* Active Leads */}
              <div
                style={{
                  padding: "14px 8px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                  textAlign: "center"
                }}
              >
                <div style={{ fontSize: "22px", fontWeight: "800", color: "#16A34A" }}>
                  {importResult.cleanCount}
                </div>
                <div style={{ fontSize: "11px", fontWeight: "600", color: "#166534", marginTop: "4px" }}>
                  Active Leads
                </div>
                <div style={{ fontSize: "10px", color: "#15803D", marginTop: "2px" }}>
                  In CRM
                </div>
              </div>

              {/* Incomplete Leads */}
              <div
                style={{
                  padding: "14px 8px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: (importResult.incompleteCount || 0) > 0 ? "#FFFBEB" : "#F8FAFC",
                  border: `1px solid ${(importResult.incompleteCount || 0) > 0 ? "#FDE68A" : "var(--border-color)"}`,
                  textAlign: "center"
                }}
              >
                <div style={{ fontSize: "22px", fontWeight: "800", color: (importResult.incompleteCount || 0) > 0 ? "#D97706" : "var(--text-muted)" }}>
                  {importResult.incompleteCount || 0}
                </div>
                <div style={{ fontSize: "11px", fontWeight: "600", color: (importResult.incompleteCount || 0) > 0 ? "#92400E" : "var(--text-secondary)", marginTop: "4px" }}>
                  Incomplete
                </div>
                <div style={{ fontSize: "10px", color: (importResult.incompleteCount || 0) > 0 ? "#B45309" : "var(--text-muted)", marginTop: "2px" }}>
                  Need Contact Info
                </div>
              </div>

              {/* Scraps */}
              <div
                style={{
                  padding: "14px 8px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: importResult.scrapCount > 0 ? "#FEF2F2" : "#F8FAFC",
                  border: `1px solid ${importResult.scrapCount > 0 ? "#FECACA" : "var(--border-color)"}`,
                  textAlign: "center"
                }}
              >
                <div style={{ fontSize: "22px", fontWeight: "800", color: importResult.scrapCount > 0 ? "#DC2626" : "var(--text-muted)" }}>
                  {importResult.scrapCount}
                </div>
                <div style={{ fontSize: "11px", fontWeight: "600", color: importResult.scrapCount > 0 ? "#991B1B" : "var(--text-secondary)", marginTop: "4px" }}>
                  Scraps
                </div>
                <div style={{ fontSize: "10px", color: importResult.scrapCount > 0 ? "#B91C1C" : "var(--text-muted)", marginTop: "2px" }}>
                  Fake / Dummy
                </div>
              </div>
            </div>

            {/* Explanatory notes */}
            {(importResult.incompleteCount || 0) > 0 && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "#FFFBEB",
                  border: "1px solid #FDE68A",
                  fontSize: "12px",
                  color: "#92400E",
                  lineHeight: "1.5",
                  marginBottom: "14px"
                }}
              >
                ℹ️ <strong>Note:</strong> {importResult.incompleteCount} legitimate records are missing phone, website, or email. They are safely preserved in <strong>Active Leads</strong> and can be enriched with web search anytime.
              </div>
            )}

            {importResult.scrapCount > 0 ? (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--bg-tertiary)",
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  lineHeight: "1.5",
                  marginBottom: "24px"
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <AnimatedEmoji emoji="💡" size={16} />
                  <span><strong>Quality Notice:</strong> {importResult.scrapCount} rows matched fake names, disposable email domains, or dummy phone numbers. They have been isolated to <strong>Scraps &gt; {importResult.fileName}</strong>. You can review or recover them at any time.</span>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--bg-tertiary)",
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  lineHeight: "1.5",
                  marginBottom: "24px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <AnimatedEmoji emoji="✨" size={16} />
                  <span><strong>Great news:</strong> 100% of rows in this spreadsheet met quality standards and zero fake records were detected.</span>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", flexWrap: "wrap" }}>
              {importResult.scrapCount > 0 && (
                <button
                  className="btn btn--secondary"
                  onClick={() => {
                    setImportResult(null);
                    navigate("/scraps");
                  }}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <FolderXIcon size={16} />
                  <span>View Scraps Folder</span>
                </button>
              )}
              {importResult.cleanCount > 0 && importResult.leadIds && importResult.leadIds.length > 0 && (
                <button
                  className="btn btn--ghost"
                  onClick={handleVerifyImported}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    borderColor: "rgba(79, 70, 229, 0.4)",
                    color: "var(--accent-primary)"
                  }}
                >
                  <ShieldCheckIcon size={15} />
                  <span>Verify Clean Leads Now</span>
                </button>
              )}
              {importResult.cleanCount > 0 && (
                <button
                  className="btn btn--ghost"
                  onClick={() => {
                    const cleanLeads = leads.filter(l => importResult.leadIds?.includes(l._id));
                    exportToExcel(
                      cleanLeads.length > 0 ? cleanLeads : leads,
                      `${importResult.fileName.replace(/\.[^/.]+$/, "")}_updated.xlsx`
                    );
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    borderColor: "rgba(16, 185, 129, 0.4)",
                    color: "#059669"
                  }}
                  title="Download clean imported leads as Excel"
                >
                  <DownloadIcon size={15} />
                  <span>Export Excel Sheet</span>
                </button>
              )}
              <button
                className="btn btn--primary"
                onClick={() => setImportResult(null)}
              >
                View Active Leads
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Intelligence & Outreach Pitch Modal */}
      <AiIntelligenceModal
        isOpen={showAiModal}
        lead={activeAiLead}
        aiData={activeAiResult}
        onClose={() => {
          setShowAiModal(false);
          setActiveAiLead(null);
          setActiveAiResult(null);
        }}
        onReAnalyze={handleReAnalyzeSingle}
        reAnalyzing={analyzingLeadId === activeAiLead?._id}
      />
    </div>
  );
};

export default Leads;
