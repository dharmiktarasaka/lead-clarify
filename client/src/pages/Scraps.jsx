import { useState, useEffect, useMemo } from "react";
import {
  FolderIcon,
  FolderOpenIcon,
  FolderXIcon,
  FileSpreadsheetIcon,
  RefreshCwIcon,
  SearchIcon,
  Trash2Icon,
  CheckIcon,
  CheckCheckIcon
} from "@animateicons/react/lucide";
import {
  getScrapFolders,
  getScraps,
  recoverSingleScrap,
  recoverBatchScraps,
  deleteSingleScrap,
  deleteBatchScraps
} from "../services/api";

const Scraps = () => {
  const [folders, setFolders] = useState([]);
  const [totalActiveScraps, setTotalActiveScraps] = useState(0);
  const [selectedFolderId, setSelectedFolderId] = useState("all");
  const [scraps, setScraps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [reasonFilter, setReasonFilter] = useState("all");
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());
  const [feedback, setFeedback] = useState(null);

  // Notify other components (like Sidebar badge)
  const notifyScrapsChange = () => {
    window.dispatchEvent(new CustomEvent("scrapsUpdated"));
  };

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  // Fetch folders and initial scraps
  const loadData = async () => {
    setLoading(true);
    try {
      const { data: folderData } = await getScrapFolders();
      setFolders(folderData.folders || []);
      setTotalActiveScraps(folderData.totalActiveScraps || 0);

      await loadScraps(selectedFolderId);
    } catch (err) {
      showFeedback("error", err.response?.data?.message || "Failed to load scraps data.");
    } finally {
      setLoading(false);
    }
  };

  const loadScraps = async (folderId) => {
    setTableLoading(true);
    try {
      const params = {};
      if (folderId && folderId !== "all") {
        params.batchId = folderId;
      }
      const { data } = await getScraps(params);
      setScraps(data.scraps || []);
      setSelectedLeadIds(new Set());
    } catch (err) {
      showFeedback("error", err.response?.data?.message || "Failed to load scrapped leads.");
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectFolder = (folderId) => {
    setSelectedFolderId(folderId);
    setSelectedLeadIds(new Set());
    loadScraps(folderId);
  };

  // Active folder details
  const activeFolder = useMemo(() => {
    if (selectedFolderId === "all") return null;
    return folders.find((f) => String(f._id) === String(selectedFolderId));
  }, [folders, selectedFolderId]);

  // Filtered scraps by search and reason
  const filteredScraps = useMemo(() => {
    return scraps.filter((item) => {
      const matchesSearch =
        !searchTerm.trim() ||
        (item.companyName && item.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.contactName && item.contactName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.email && item.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.phone && item.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.importFileName && item.importFileName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesReason =
        reasonFilter === "all" ||
        (item.scrapReasons &&
          item.scrapReasons.some((r) => r.toLowerCase().includes(reasonFilter.toLowerCase())));

      return matchesSearch && matchesReason;
    });
  }, [scraps, searchTerm, reasonFilter]);

  // Multi-select helpers
  const handleToggleSelectAll = () => {
    if (selectedLeadIds.size === filteredScraps.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(filteredScraps.map((s) => s._id)));
    }
  };

  const handleToggleSelectOne = (id) => {
    const next = new Set(selectedLeadIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedLeadIds(next);
  };

  // Single lead recovery
  const handleRecoverSingle = async (lead) => {
    setActionLoading(true);
    try {
      const { data } = await recoverSingleScrap(lead._id);
      showFeedback("success", data.message || `Lead recovered to active leads!`);
      // Update local state
      setScraps((prev) => prev.filter((s) => s._id !== lead._id));
      setTotalActiveScraps((prev) => Math.max(0, prev - 1));
      setFolders((prev) =>
        prev.map((f) =>
          String(f._id) === String(lead.importBatchId)
            ? { ...f, activeScraps: Math.max(0, f.activeScraps - 1) }
            : f
        )
      );
      notifyScrapsChange();
    } catch (err) {
      showFeedback("error", err.response?.data?.message || "Failed to recover lead.");
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk recovery (selected or all in folder)
  const handleRecoverBatch = async (mode = "selected") => {
    let payload = {};
    let confirmMsg = "";

    if (mode === "selected") {
      const ids = Array.from(selectedLeadIds);
      if (ids.length === 0) return;
      payload = { leadIds: ids };
      confirmMsg = `Recover ${ids.length} selected lead(s) back to the active leads section?`;
    } else if (mode === "folder") {
      if (!selectedFolderId || selectedFolderId === "all") {
        payload = { all: true };
        confirmMsg = `Recover all ${scraps.length} leads across all spreadsheets back to active leads?`;
      } else {
        payload = { batchId: selectedFolderId };
        confirmMsg = `Recover all leads from "${activeFolder?.fileName || "this spreadsheet"}" back to active leads?`;
      }
    }

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const { data } = await recoverBatchScraps(payload);
      showFeedback("success", data.message || `Leads recovered successfully!`);
      // Refresh folders and scraps
      const { data: folderData } = await getScrapFolders();
      setFolders(folderData.folders || []);
      setTotalActiveScraps(folderData.totalActiveScraps || 0);
      await loadScraps(selectedFolderId);
      notifyScrapsChange();
    } catch (err) {
      showFeedback("error", err.response?.data?.message || "Failed to recover leads.");
    } finally {
      setActionLoading(false);
    }
  };

  // Single delete
  const handleDeleteSingle = async (lead) => {
    if (!window.confirm(`Permanently delete scrap lead "${lead.companyName || lead.contactName || "Record"}"? This cannot be undone.`)) {
      return;
    }
    setActionLoading(true);
    try {
      await deleteSingleScrap(lead._id);
      showFeedback("success", "Scrap lead permanently deleted.");
      setScraps((prev) => prev.filter((s) => s._id !== lead._id));
      setTotalActiveScraps((prev) => Math.max(0, prev - 1));
      setFolders((prev) =>
        prev.map((f) =>
          String(f._id) === String(lead.importBatchId)
            ? { ...f, activeScraps: Math.max(0, f.activeScraps - 1) }
            : f
        )
      );
      notifyScrapsChange();
    } catch (err) {
      showFeedback("error", err.response?.data?.message || "Failed to delete lead.");
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk delete
  const handleDeleteBatch = async (mode = "selected") => {
    let payload = {};
    let confirmMsg = "";

    if (mode === "selected") {
      const ids = Array.from(selectedLeadIds);
      if (ids.length === 0) return;
      payload = { leadIds: ids };
      confirmMsg = `Permanently delete ${ids.length} selected scrap lead(s)? This action cannot be undone.`;
    } else if (mode === "folder") {
      if (!selectedFolderId || selectedFolderId === "all") {
        payload = { all: true };
        confirmMsg = `Permanently delete ALL ${scraps.length} scrap leads across all folders?`;
      } else {
        payload = { batchId: selectedFolderId };
        confirmMsg = `Permanently delete all scrap leads from spreadsheet "${activeFolder?.fileName}"?`;
      }
    }

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const { data } = await deleteBatchScraps(payload);
      showFeedback("success", data.message || "Scrap leads permanently deleted.");
      const { data: folderData } = await getScrapFolders();
      setFolders(folderData.folders || []);
      setTotalActiveScraps(folderData.totalActiveScraps || 0);
      await loadScraps(selectedFolderId);
      notifyScrapsChange();
    } catch (err) {
      showFeedback("error", err.response?.data?.message || "Failed to delete scraps.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Loading scraps & folders...</p>
      </div>
    );
  }

  return (
    <div className="scraps-page" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      {/* Feedback Alert */}
      {feedback && (
        <div
          style={{
            marginBottom: "20px",
            padding: "14px 18px",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "14px",
            fontWeight: "500",
            backgroundColor: feedback.type === "success" ? "#F0FDF4" : "#FEF2F2",
            color: feedback.type === "success" ? "#166534" : "#991B1B",
            border: `1px solid ${feedback.type === "success" ? "#BBF7D0" : "#FECACA"}`,
            boxShadow: "var(--shadow-sm)"
          }}
        >
          <span style={{ fontSize: "16px" }}>{feedback.type === "success" ? "✅" : "⚠️"}</span>
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "700", letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
              Scraps & Filtered Leads
            </h1>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "700",
                padding: "1px 8px",
                backgroundColor: totalActiveScraps > 0 ? "#FEE2E2" : "#DCFCE7",
                color: totalActiveScraps > 0 ? "#DC2626" : "#16A34A",
                borderRadius: "10px",
                border: `1px solid ${totalActiveScraps > 0 ? "#FECACA" : "#BBF7D0"}`
              }}
            >
              {totalActiveScraps} Scrapped
            </span>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px", marginBottom: 0 }}>
            Quality control automatically detected and isolated fake, dummy, or invalid leads from your Excel uploads.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="btn btn--secondary"
            onClick={loadData}
            disabled={tableLoading || actionLoading}
            style={{ fontSize: "12px", padding: "6px 10px", display: "inline-flex", alignItems: "center", gap: "5px" }}
          >
            <RefreshCwIcon size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Folder Explorer on Left + Scraps View on Right */}
      <div className="scraps-layout" style={{ display: "grid", gridTemplateColumns: "minmax(200px, 230px) minmax(0, 1fr)", gap: "14px", alignItems: "start", width: "100%" }}>
        {/* Left: Folder Hierarchy Navigator */}
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md)",
            padding: "12px 14px",
            boxShadow: "var(--shadow-sm)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", paddingBottom: "8px", borderBottom: "1px solid var(--border-color-light)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <FolderOpenIcon size={15} color="var(--accent-primary)" />
              <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>Spreadsheet Folders</span>
            </div>
            <span style={{ fontSize: "10px", fontWeight: "700", color: "var(--text-muted)", backgroundColor: "var(--bg-tertiary)", padding: "1px 5px", borderRadius: "4px" }}>
              {folders.length}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {/* All Scraps Option */}
            <button
              onClick={() => handleSelectFolder("all")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "7px 10px",
                borderRadius: "var(--radius-sm)",
                border: selectedFolderId === "all" ? "1px solid var(--accent-primary)" : "1px solid transparent",
                backgroundColor: selectedFolderId === "all" ? "var(--accent-light)" : "transparent",
                color: selectedFolderId === "all" ? "var(--accent-primary)" : "var(--text-primary)",
                fontWeight: selectedFolderId === "all" ? "600" : "500",
                fontSize: "12px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s ease"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                <FolderIcon size={14} />
                <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>All Spreadsheets</span>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  padding: "1px 6px",
                  borderRadius: "8px",
                  backgroundColor: selectedFolderId === "all" ? "var(--accent-primary)" : "var(--bg-tertiary)",
                  color: selectedFolderId === "all" ? "#FFFFFF" : "var(--text-secondary)"
                }}
              >
                {totalActiveScraps}
              </span>
            </button>

            {/* Individual Folders */}
            {folders.map((folder) => {
              const isSelected = String(folder._id) === String(selectedFolderId);
              return (
                <button
                  key={folder._id}
                  onClick={() => handleSelectFolder(String(folder._id))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "7px 10px",
                    borderRadius: "var(--radius-sm)",
                    border: isSelected ? "1px solid var(--accent-primary)" : "1px solid transparent",
                    backgroundColor: isSelected ? "var(--accent-light)" : "transparent",
                    color: isSelected ? "var(--accent-primary)" : "var(--text-primary)",
                    fontWeight: isSelected ? "600" : "500",
                    fontSize: "12px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                    <FileSpreadsheetIcon size={14} />
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {folder.fileName}
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: "400", marginTop: "1px" }}>
                        {new Date(folder.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "700",
                      padding: "1px 6px",
                      borderRadius: "8px",
                      backgroundColor: folder.activeScraps > 0 ? "#FEE2E2" : "var(--bg-tertiary)",
                      color: folder.activeScraps > 0 ? "#DC2626" : "var(--text-muted)",
                      marginLeft: "4px"
                    }}
                  >
                    {folder.activeScraps}
                  </span>
                </button>
              );
            })}

            {folders.length === 0 && (
              <div style={{ padding: "16px 8px", textAlign: "center", color: "var(--text-muted)", fontSize: "11px" }}>
                No spreadsheets imported yet.
              </div>
            )}
          </div>
        </div>

        {/* Right: Folder Details & Scrapped Leads Table */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: 0, width: "100%" }}>
          {/* Folder Details Banner */}
          {activeFolder && (
            <div
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                padding: "10px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                boxShadow: "var(--shadow-sm)"
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <FileSpreadsheetIcon size={16} color="var(--accent-primary)" />
                  <h2 style={{ fontSize: "13.5px", fontWeight: "700", margin: 0, color: "var(--text-primary)" }}>
                    {activeFolder.fileName}
                  </h2>
                </div>
                <div style={{ display: "flex", gap: "12px", marginTop: "4px", fontSize: "11.5px", color: "var(--text-secondary)", flexWrap: "wrap" }}>
                  <span>
                    Uploaded: <strong>{new Date(activeFolder.createdAt).toLocaleDateString()}</strong>
                  </span>
                  <span>
                    Total: <strong>{activeFolder.totalRows}</strong>
                  </span>
                  <span>
                    Clean: <strong style={{ color: "#16A34A" }}>{activeFolder.cleanCount}</strong>
                  </span>
                  <span>
                    Scraps: <strong style={{ color: "#DC2626" }}>{activeFolder.activeScraps}</strong>
                  </span>
                </div>
              </div>

              {activeFolder.activeScraps > 0 && (
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    className="btn btn--primary"
                    onClick={() => handleRecoverBatch("folder")}
                    disabled={actionLoading}
                    style={{ fontSize: "11px", padding: "4px 8px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <CheckCheckIcon size={13} />
                    <span>Recover All From Sheet</span>
                  </button>
                  <button
                    className="btn btn--secondary"
                    onClick={() => handleDeleteBatch("folder")}
                    disabled={actionLoading}
                    style={{ fontSize: "11px", padding: "4px 8px", color: "#DC2626", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <Trash2Icon size={13} />
                    <span>Empty Folder</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Search, Filters & Bulk Actions Toolbar */}
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)",
              padding: "8px 12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
              boxShadow: "var(--shadow-sm)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "220px", flexWrap: "wrap" }}>
              <div style={{ position: "relative", width: "100%", maxWidth: "260px", minWidth: "160px" }}>
                <input
                  type="text"
                  placeholder="Search company, contact, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%",
                    height: "30px",
                    padding: "4px 8px 4px 28px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-color)",
                    fontSize: "12px",
                    backgroundColor: "var(--bg-primary)",
                    color: "var(--text-primary)"
                  }}
                />
                <span style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "inline-flex" }}>
                  <SearchIcon size={13} />
                </span>
              </div>

              <select
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
                style={{
                  height: "30px",
                  padding: "4px 8px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-color)",
                  fontSize: "12px",
                  backgroundColor: "var(--bg-primary)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  maxWidth: "200px"
                }}
              >
                <option value="all">All Rejection Reasons</option>
                <option value="disposable">Disposable / Fake Email</option>
                <option value="prefix">Placeholder Email (test@, demo@)</option>
                <option value="phone">Sequential / Dummy Phone</option>
                <option value="contact name">Dummy Contact Name</option>
                <option value="company name">Dummy Company Name</option>
                <option value="uncontactable">Uncontactable (No Email/Phone)</option>
              </select>
            </div>

            {/* Selected Rows Action Bar */}
            {selectedLeadIds.size > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "var(--accent-light)", padding: "4px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color-focus)", flexWrap: "wrap" }}>
                <span style={{ fontSize: "11.5px", fontWeight: "600", color: "var(--accent-primary)" }}>
                  {selectedLeadIds.size} selected
                </span>
                <button
                  className="btn btn--primary"
                  onClick={() => handleRecoverBatch("selected")}
                  disabled={actionLoading}
                  style={{ fontSize: "11px", padding: "4px 8px", display: "inline-flex", alignItems: "center", gap: "3px" }}
                >
                  <CheckIcon size={12} />
                  <span>Recover</span>
                </button>
                <button
                  className="btn btn--secondary"
                  onClick={() => handleDeleteBatch("selected")}
                  disabled={actionLoading}
                  style={{ fontSize: "11px", padding: "4px 8px", color: "#DC2626", display: "inline-flex", alignItems: "center", gap: "3px" }}
                >
                  <Trash2Icon size={12} />
                  <span>Delete</span>
                </button>
                <button
                  onClick={() => setSelectedLeadIds(new Set())}
                  style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "11px", cursor: "pointer", textDecoration: "underline" }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Scraps Table Card */}
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
              boxShadow: "var(--shadow-sm)",
              width: "100%",
              minWidth: 0
            }}
          >
            {tableLoading ? (
              <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
                <div className="loading-spinner" style={{ margin: "0 auto 10px auto", width: "28px", height: "28px" }}></div>
                <p style={{ fontSize: "12px", margin: 0 }}>Loading records...</p>
              </div>
            ) : filteredScraps.length === 0 ? (
              <div style={{ padding: "40px 16px", textAlign: "center" }}>
                <div style={{ width: "38px", height: "38px", borderRadius: "19px", backgroundColor: "#DCFCE7", color: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px auto" }}>
                  <CheckCheckIcon size={20} />
                </div>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
                  {scraps.length === 0
                    ? selectedFolderId === "all"
                      ? "No Scrapped Leads! Your CRM is 100% clean."
                      : "All leads from this spreadsheet are clean or have been recovered!"
                    : "No records match your search criteria."}
                </h3>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", maxWidth: "380px", margin: "0 auto" }}>
                  {scraps.length === 0
                    ? "When you upload future Excel or CSV spreadsheets, any fake or dummy entries will be isolated and stored here automatically."
                    : "Try resetting your search query or reason filter to see more items."}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto", width: "100%" }}>
                <table style={{ width: "100%", minWidth: "700px", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "var(--bg-tertiary)", borderBottom: "1px solid var(--border-color)", color: "var(--text-secondary)", fontWeight: "600", fontSize: "11px" }}>
                      <th style={{ padding: "8px 8px 8px 10px", width: "32px" }}>
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.size === filteredScraps.length && filteredScraps.length > 0}
                          onChange={handleToggleSelectAll}
                          style={{ cursor: "pointer" }}
                        />
                      </th>
                      <th style={{ padding: "8px 10px", minWidth: "130px" }}>Lead & Company</th>
                      <th style={{ padding: "8px 10px", minWidth: "150px" }}>Flagged Reasons</th>
                      <th style={{ padding: "8px 10px", minWidth: "120px" }}>Contact Info</th>
                      <th style={{ padding: "8px 10px", minWidth: "100px" }}>Origin Sheet</th>
                      <th style={{ padding: "8px 10px", minWidth: "85px" }}>Detected At</th>
                      <th style={{ padding: "8px 10px", minWidth: "95px", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredScraps.map((lead) => {
                      const isSelected = selectedLeadIds.has(lead._id);
                      return (
                        <tr
                          key={lead._id}
                          style={{
                            borderBottom: "1px solid var(--border-color-light)",
                            backgroundColor: isSelected ? "var(--accent-light)" : "transparent",
                            transition: "background-color 0.15s ease"
                          }}
                        >
                          <td style={{ padding: "7px 8px 7px 10px" }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectOne(lead._id)}
                              style={{ cursor: "pointer" }}
                            />
                          </td>

                          {/* Company & Contact */}
                          <td style={{ padding: "7px 10px" }}>
                            <div style={{ fontWeight: "600", color: "var(--text-primary)", fontSize: "12px", wordBreak: "break-word" }}>
                              {lead.companyName}
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "1px" }}>
                              {lead.contactName || "—"}
                            </div>
                          </td>

                          {/* Flagged Reasons */}
                          <td style={{ padding: "7px 10px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                              {lead.scrapReasons && lead.scrapReasons.length > 0 ? (
                                lead.scrapReasons.map((reason, idx) => (
                                  <span
                                    key={idx}
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: "600",
                                      backgroundColor: "#FEF2F2",
                                      color: "#B91C1C",
                                      border: "1px solid #FECACA",
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      display: "inline-block",
                                      maxWidth: "200px",
                                      wordBreak: "break-word",
                                      lineHeight: "1.25"
                                    }}
                                  >
                                    ⚠️ {reason}
                                  </span>
                                ))
                              ) : (
                                <span style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>Flagged by Heuristic</span>
                              )}
                            </div>
                          </td>

                          {/* Contact Info */}
                          <td style={{ padding: "7px 10px" }}>
                            <div style={{ fontSize: "11px", color: lead.email ? "var(--text-primary)" : "var(--text-muted)", wordBreak: "break-all" }}>
                              ✉️ {lead.email || "No email"}
                            </div>
                            <div style={{ fontSize: "11px", color: lead.phone ? "var(--text-secondary)" : "var(--text-muted)", marginTop: "2px" }}>
                              📞 {lead.phone || "No phone"}
                            </div>
                          </td>

                          {/* Origin Sheet Folder Tag */}
                          <td style={{ padding: "7px 10px" }}>
                            <span
                              title={lead.importFileName || "Direct Import"}
                              style={{
                                fontSize: "10.5px",
                                fontWeight: "500",
                                color: "var(--accent-primary)",
                                backgroundColor: "var(--accent-light)",
                                border: "1px solid var(--border-color-focus)",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                maxWidth: "120px"
                              }}
                            >
                              <FileSpreadsheetIcon size={11} style={{ flexShrink: 0 }} />
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {lead.importFileName || "Direct Import"}
                              </span>
                            </span>
                          </td>

                          {/* Date */}
                          <td style={{ padding: "7px 10px", fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                            {new Date(lead.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </td>

                          {/* Actions: Single Recover & Delete */}
                          <td style={{ padding: "7px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                            <div style={{ display: "inline-flex", gap: "4px" }}>
                              <button
                                onClick={() => handleRecoverSingle(lead)}
                                disabled={actionLoading}
                                title="Recover to active leads"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  padding: "3px 8px",
                                  borderRadius: "var(--radius-sm)",
                                  backgroundColor: "#EEF2FF",
                                  color: "var(--accent-primary)",
                                  border: "1px solid var(--border-color-focus)",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                  transition: "all 0.15s ease"
                                }}
                              >
                                <CheckIcon size={12} />
                                <span>Recover</span>
                              </button>

                              <button
                                onClick={() => handleDeleteSingle(lead)}
                                disabled={actionLoading}
                                title="Delete permanently"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "3px 6px",
                                  borderRadius: "var(--radius-sm)",
                                  backgroundColor: "transparent",
                                  color: "var(--text-muted)",
                                  border: "1px solid var(--border-color)",
                                  fontSize: "11px",
                                  cursor: "pointer"
                                }}
                              >
                                <Trash2Icon size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scraps;
