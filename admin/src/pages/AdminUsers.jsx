import { useState, useEffect } from "react";
import {
  getAdminUsers,
  getAdminUserById,
  updateAdminUserStatus,
  updateAdminUserRole,
  updateAdminUserCredits,
  sendAdminCreditsLookup,
  deleteAdminUser
} from "../services/api";
import {
  UsersIcon,
  SearchIcon,
  ShieldCheckIcon,
  Trash2Icon,
  CheckIcon,
  XIcon,
  EyeIcon,
  RefreshCwIcon,
  HistoryIcon
} from "@animateicons/react/lucide";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [notice, setNotice] = useState(null);

  // User detail drawer modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);

  // Send Credits Modal state
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [creditTargetUser, setCreditTargetUser] = useState(null);
  const [creditLookupInput, setCreditLookupInput] = useState("");
  const [creditAmount, setCreditAmount] = useState(1000);
  const [creditMode, setCreditMode] = useState("add"); // "add" or "set"
  const [creditSubmitting, setCreditSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers(1);
  }, [search, roleFilter, statusFilter]);

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;

      const { data } = await getAdminUsers(params);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  const showNotice = (text, type = "success") => {
    setNotice({ text, type });
    setTimeout(() => setNotice(null), 4000);
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === "active" ? "suspended" : "active";
    try {
      await updateAdminUserStatus(user._id, newStatus);
      showNotice(`User ${user.email} status changed to ${newStatus}.`, "success");
      fetchUsers(pagination.page);
    } catch (err) {
      showNotice(err.response?.data?.message || err.message, "danger");
    }
  };

  const handleToggleRole = async (user) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    try {
      await updateAdminUserRole(user._id, newRole);
      showNotice(`User ${user.email} role changed to ${newRole}.`, "success");
      fetchUsers(pagination.page);
    } catch (err) {
      showNotice(err.response?.data?.message || err.message, "danger");
    }
  };

  const handleDeleteUser = async (user) => {
    try {
      await deleteAdminUser(user._id);
      showNotice(`User ${user.email} and all their leads were removed.`, "success");
      fetchUsers(pagination.page);
    } catch (err) {
      showNotice(err.response?.data?.message || err.message, "danger");
    }
  };

  const handleInspectUser = async (userId) => {
    setUserDetailLoading(true);
    try {
      const { data } = await getAdminUserById(userId);
      setSelectedUser(data);
    } catch (err) {
      alert("Failed to load user details: " + err.message);
    } finally {
      setUserDetailLoading(false);
    }
  };

  const handleOpenSendCredits = (user = null) => {
    setCreditTargetUser(user);
    setCreditLookupInput(user ? (user._id || user.email) : "");
    setCreditAmount(1000);
    setCreditMode("add");
    setCreditModalOpen(true);
  };

  const handleSendCreditsSubmit = async (e) => {
    e.preventDefault();
    const amountNum = parseInt(creditAmount, 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      showNotice("Please enter a valid credit amount greater than 0.", "danger");
      return;
    }

    setCreditSubmitting(true);
    try {
      let res;
      if (creditTargetUser?._id) {
        res = await updateAdminUserCredits(creditTargetUser._id, {
          amount: amountNum,
          mode: creditMode
        });
      } else {
        const trimmed = creditLookupInput.trim();
        if (!trimmed) {
          showNotice("Please enter a User ID or user Email address.", "danger");
          setCreditSubmitting(false);
          return;
        }
        res = await sendAdminCreditsLookup({
          userId: trimmed,
          email: trimmed,
          amount: amountNum,
          mode: creditMode
        });
      }

      showNotice(res.data.message || "Credits transferred successfully!", "success");
      setCreditModalOpen(false);
      fetchUsers(pagination.page);

      if (selectedUser?.user && (selectedUser.user._id === creditTargetUser?._id || selectedUser.user._id === res.data.user?._id)) {
        setSelectedUser((prev) => ({
          ...prev,
          user: {
            ...prev.user,
            credits: res.data.totalCredits,
            maxDailyCredits: res.data.user?.maxDailyCredits
          }
        }));
      }
    } catch (err) {
      showNotice(err.response?.data?.message || err.message, "danger");
    } finally {
      setCreditSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: "800", color: "var(--text-primary)", letterSpacing: "-0.02em", margin: 0 }}>
            User Management & Logins
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: "4px 0 0" }}>
            Monitor active customer accounts, session login frequencies, and manage credits
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => handleOpenSendCredits(null)}
            className="admin-btn admin-btn--primary"
            style={{ gap: "6px" }}
            title="Send credits to any user ID or Email"
          >
            <span>⚡ Send Credits</span>
          </button>

          <button
            onClick={() => fetchUsers(pagination.page)}
            className="admin-btn admin-btn--secondary"
          >
            <RefreshCwIcon size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Notice Alert */}
      {notice && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "var(--radius-sm)",
            fontSize: "13px",
            fontWeight: "600",
            background: notice.type === "danger" ? "#FEF2F2" : "#F0FDF4",
            border: `1px solid ${notice.type === "danger" ? "#FECACA" : "#BBF7D0"}`,
            color: notice.type === "danger" ? "var(--danger)" : "var(--success)"
          }}
        >
          {notice.text}
        </div>
      )}

      {/* Filters Bar */}
      {/* Filters Bar */}
      <div className="admin-card" style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 260px", maxWidth: "420px" }}>
            <input
              type="text"
              className="admin-input"
              style={{ width: "100%", paddingLeft: "36px", paddingRight: search ? "32px" : "12px" }}
              placeholder="Search by name, email..."
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
                <XIcon size={14} />
              </button>
            )}
          </div>

          {/* Filters & Summary */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Role Filter */}
            <select
              className="admin-input"
              style={{ width: "auto", cursor: "pointer" }}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>

            {/* Status Filter */}
            <select
              className="admin-input"
              style={{ width: "auto", cursor: "pointer" }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>

            {(search || roleFilter || statusFilter) && (
              <button
                onClick={() => { setSearch(""); setRoleFilter(""); setStatusFilter(""); }}
                className="admin-btn admin-btn--secondary admin-btn--sm"
                title="Reset all filters"
              >
                <XIcon size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="admin-table-container">
        <div className="admin-table-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <UsersIcon size={16} color="var(--accent-primary)" />
            <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>All Users ({pagination.total})</strong>
          </div>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Showing page {pagination.page} of {pagination.pages || 1}
          </span>
        </div>

        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ whiteSpace: "nowrap" }}>User</th>
                <th style={{ whiteSpace: "nowrap" }}>Role</th>
                <th style={{ whiteSpace: "nowrap" }}>Status</th>
                <th style={{ whiteSpace: "nowrap" }}>Credits</th>
                <th style={{ whiteSpace: "nowrap" }}>Logins</th>
                <th style={{ whiteSpace: "nowrap" }}>Last Active</th>
                <th style={{ whiteSpace: "nowrap" }}>Leads</th>
                <th style={{ whiteSpace: "nowrap" }}>Joined</th>
                <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: "190px" }}>
                        <div
                          style={{
                            width: "34px",
                            height: "34px",
                            borderRadius: "50%",
                            background: u.role === "admin" ? "var(--accent-light)" : "var(--bg-tertiary)",
                            color: u.role === "admin" ? "var(--accent-primary)" : "var(--text-primary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "700",
                            fontSize: "13px",
                            flexShrink: 0
                          }}
                        >
                          {u.name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div style={{ overflow: "hidden" }}>
                          <strong style={{ display: "block", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</strong>
                          <span style={{ fontSize: "12px", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{u.email}</span>
                        </div>
                      </div>
                    </td>

                    <td style={{ whiteSpace: "nowrap" }}>
                      <span className={`badge-pill ${u.role === "admin" ? "badge-pill--admin" : "badge-pill--user"}`}>
                        {u.role === "admin" && <ShieldCheckIcon size={11} />}
                        {u.role}
                      </span>
                    </td>

                    <td style={{ whiteSpace: "nowrap" }}>
                      <span className={`badge-pill ${u.status === "suspended" ? "badge-pill--suspended" : "badge-pill--active"}`}>
                        <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: u.status === "suspended" ? "var(--danger)" : "var(--success)" }}></span>
                        {u.status}
                      </span>
                    </td>

                    <td style={{ whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                        <span style={{ fontSize: "13px" }}>⚡</span>
                        <strong style={{ color: "var(--accent-primary)", fontSize: "13px" }}>
                          {(u.credits !== undefined ? u.credits : 1000).toLocaleString()}
                        </strong>
                      </div>
                    </td>

                    <td style={{ whiteSpace: "nowrap" }}>
                      <strong style={{ color: "var(--accent-primary)", fontSize: "13px" }}>
                        {u.loginCount || 0}
                      </strong>{" "}
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>logins</span>
                    </td>

                    <td style={{ whiteSpace: "nowrap" }}>
                      {u.lastLogin ? (
                        <div>
                          <span style={{ display: "block", color: "var(--text-primary)", fontSize: "12px" }}>
                            {new Date(u.lastLogin).toLocaleDateString()}
                          </span>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                            {new Date(u.lastLogin).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Never</span>
                      )}
                    </td>

                    <td style={{ whiteSpace: "nowrap" }}>
                      <strong style={{ color: "var(--text-primary)" }}>{u.leadCount || 0}</strong>
                    </td>

                    <td style={{ color: "var(--text-muted)", fontSize: "12px", whiteSpace: "nowrap" }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                        {/* Send Credits Button */}
                        <button
                          onClick={() => handleOpenSendCredits(u)}
                          className="admin-btn admin-btn--secondary admin-btn--sm"
                          title="Send credits to this user"
                          style={{
                            padding: "5px 8px",
                            fontSize: "11px",
                            color: "var(--accent-primary)",
                            borderColor: "rgba(79, 70, 229, 0.3)",
                            background: "#EEF2FF",
                            fontWeight: "700"
                          }}
                        >
                          ⚡ +Credits
                        </button>

                        {/* Inspect User */}
                        <button
                          onClick={() => handleInspectUser(u._id)}
                          className="admin-btn admin-btn--secondary admin-btn--sm"
                          title="Inspect user profile & login history"
                          style={{ padding: "5px 8px" }}
                        >
                          <EyeIcon size={14} />
                        </button>

                        {/* Suspend / Activate */}
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`admin-btn admin-btn--sm ${u.status === "active" ? "admin-btn--danger" : "admin-btn--success"}`}
                          title={u.status === "active" ? "Suspend user access" : "Activate user account"}
                          style={{ padding: "5px 9px", fontSize: "11px" }}
                        >
                          {u.status === "active" ? "Suspend" : "Activate"}
                        </button>

                        {/* Promote / Demote */}
                        <button
                          onClick={() => handleToggleRole(u)}
                          className="admin-btn admin-btn--secondary admin-btn--sm"
                          title={u.role === "admin" ? "Demote to standard user" : "Promote to administrator"}
                          style={{ padding: "5px 9px", fontSize: "11px" }}
                        >
                          {u.role === "admin" ? "Demote" : "Make Admin"}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="admin-btn admin-btn--danger admin-btn--sm"
                          title="Delete user permanently"
                          style={{ padding: "5px 8px" }}
                        >
                          <Trash2Icon size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {pagination.pages > 1 && (
          <div style={{ padding: "16px 20px", display: "flex", justifyContent: "flex-end", gap: "8px", borderTop: "1px solid var(--border-primary)" }}>
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchUsers(pagination.page - 1)}
              className="admin-btn admin-btn--secondary admin-btn--sm"
            >
              Previous
            </button>
            <span style={{ display: "flex", alignItems: "center", padding: "0 10px", fontSize: "12px", color: "var(--text-secondary)" }}>
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchUsers(pagination.page + 1)}
              className="admin-btn admin-btn--secondary admin-btn--sm"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* User Inspection Modal Drawer */}
      {selectedUser && (
        <div className="admin-modal-overlay" onClick={() => setSelectedUser(null)}>
          <div
            className="admin-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "680px", maxHeight: "88vh", display: "flex", flexDirection: "column" }}
          >
            {/* Modal Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-primary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF", fontWeight: "800" }}>
                  {selectedUser.user.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", color: "var(--text-primary)" }}>{selectedUser.user.name}</h3>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{selectedUser.user.email}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <XIcon size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Account Overview Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" }}>
                <div style={{ background: "var(--bg-tertiary)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--border-color-light)" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>ROLE</span>
                  <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>{selectedUser.user.role}</strong>
                </div>
                <div style={{ background: "var(--bg-tertiary)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--border-color-light)" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>STATUS</span>
                  <strong style={{ fontSize: "14px", color: selectedUser.user.status === "active" ? "var(--success)" : "var(--danger)" }}>
                    {selectedUser.user.status}
                  </strong>
                </div>
                <div style={{ background: "var(--bg-tertiary)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--border-color-light)" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>LIVE CREDITS</span>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "2px" }}>
                    <strong style={{ fontSize: "14px", color: "var(--accent-primary)" }}>
                      ⚡ {(selectedUser.user.credits !== undefined ? selectedUser.user.credits : 1000).toLocaleString()}
                    </strong>
                    <button
                      onClick={() => handleOpenSendCredits(selectedUser.user)}
                      className="admin-btn admin-btn--primary admin-btn--sm"
                      style={{ padding: "2px 7px", fontSize: "11px" }}
                      title="Add credits to this user"
                    >
                      +Add
                    </button>
                  </div>
                </div>
                <div style={{ background: "var(--bg-tertiary)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--border-color-light)" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>TOTAL LOGINS</span>
                  <strong style={{ fontSize: "14px", color: "var(--accent-primary)" }}>{selectedUser.user.loginCount || 0}</strong>
                </div>
              </div>

              {/* Login Session History */}
              <div>
                <h4 style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <HistoryIcon size={14} color="var(--accent-primary)" /> Recent Login Sessions
                </h4>
                {selectedUser.user.loginHistory && selectedUser.user.loginHistory.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {selectedUser.user.loginHistory.slice(0, 5).map((log, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "8px 12px",
                          background: "var(--bg-tertiary)",
                          borderRadius: "6px",
                          fontSize: "12px",
                          display: "flex",
                          justifyContent: "space-between",
                          color: "var(--text-secondary)"
                        }}
                      >
                        <span>IP: {log.ip || "127.0.0.1"} • {log.userAgent?.substring(0, 30) || "Browser"}</span>
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>No login history logged yet.</p>
                )}
              </div>

              {/* User Leads */}
              <div>
                <h4 style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "10px" }}>
                  Leads Generated ({selectedUser.totalLeads})
                </h4>
                {selectedUser.recentLeads && selectedUser.recentLeads.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {selectedUser.recentLeads.slice(0, 5).map((ld) => (
                      <div
                        key={ld._id}
                        style={{
                          padding: "8px 12px",
                          background: "var(--bg-tertiary)",
                          borderRadius: "6px",
                          fontSize: "12px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <div>
                          <strong style={{ color: "var(--text-primary)", display: "block" }}>{ld.companyName}</strong>
                          <span style={{ color: "var(--text-muted)" }}>{ld.phone || "No phone"} • {ld.email || "No email"}</span>
                        </div>
                        <span style={{ fontWeight: "700", color: ld.score >= 80 ? "var(--danger)" : "var(--warning)" }}>
                          Score: {ld.score}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>This user has not created any leads yet.</p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-primary)", display: "flex", justifyContent: "flex-end" }}>
              <button className="admin-btn admin-btn--secondary" onClick={() => setSelectedUser(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Credits Modal */}
      {creditModalOpen && (
        <div className="admin-modal-overlay" onClick={() => !creditSubmitting && setCreditModalOpen(false)}>
          <div
            className="admin-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "480px", width: "100%", padding: 0, overflow: "hidden" }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--border-primary)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "linear-gradient(135deg, #EEF2FF, #FFFFFF)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #6366F1, #4F46E5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#FFF",
                    fontSize: "18px"
                  }}
                >
                  ⚡
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "var(--text-primary)" }}>
                    Send User Credits
                  </h3>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    Instant live credit balance transfer
                  </span>
                </div>
              </div>
              <button
                onClick={() => !creditSubmitting && setCreditModalOpen(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}
              >
                <XIcon size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSendCreditsSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Target User Info */}
              {creditTargetUser ? (
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "8px",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-primary)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <strong style={{ display: "block", fontSize: "13px", color: "var(--text-primary)" }}>
                      {creditTargetUser.name}
                    </strong>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      {creditTargetUser.email}
                    </span>
                    <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace", marginTop: "2px" }}>
                      ID: {creditTargetUser._id}
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>CURRENT BALANCE</span>
                    <strong style={{ fontSize: "15px", color: "var(--accent-primary)" }}>
                      ⚡ {(creditTargetUser.credits !== undefined ? creditTargetUser.credits : 1000).toLocaleString()}
                    </strong>
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase" }}>
                    User ID or User Email Address
                  </label>
                  <input
                    type="text"
                    required
                    className="admin-input"
                    style={{ width: "100%" }}
                    placeholder="Enter MongoDB User ID or user email..."
                    value={creditLookupInput}
                    onChange={(e) => setCreditLookupInput(e.target.value)}
                  />
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                    Paste any customer user ID or their registered email address
                  </span>
                </div>
              )}

              {/* Mode Switcher */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase" }}>
                  Action Type
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setCreditMode("add")}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "700",
                      border: "1px solid",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      background: creditMode === "add" ? "#EEF2FF" : "var(--bg-tertiary)",
                      borderColor: creditMode === "add" ? "var(--accent-primary)" : "var(--border-primary)",
                      color: creditMode === "add" ? "var(--accent-primary)" : "var(--text-secondary)"
                    }}
                  >
                    <span>➕ Add to Balance</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreditMode("set")}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "700",
                      border: "1px solid",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      background: creditMode === "set" ? "#EEF2FF" : "var(--bg-tertiary)",
                      borderColor: creditMode === "set" ? "var(--accent-primary)" : "var(--border-primary)",
                      color: creditMode === "set" ? "var(--accent-primary)" : "var(--text-secondary)"
                    }}
                  >
                    <span>⚙️ Set Exact Total</span>
                  </button>
                </div>
              </div>

              {/* Credit Amount */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase" }}>
                  {creditMode === "add" ? "Credits to Send" : "Set New Credit Balance"}
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    min="1"
                    required
                    className="admin-input"
                    style={{ width: "100%", fontSize: "16px", fontWeight: "700", paddingLeft: "36px" }}
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(Math.max(1, parseInt(e.target.value, 10) || 0))}
                  />
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px" }}>
                    ⚡
                  </span>
                </div>

                {/* Quick select pills */}
                <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                  {[250, 500, 1000, 2500, 5000, 10000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCreditAmount(amt)}
                      style={{
                        padding: "4px 8px",
                        fontSize: "11px",
                        fontWeight: "600",
                        borderRadius: "14px",
                        background: creditAmount === amt ? "var(--accent-primary)" : "var(--bg-tertiary)",
                        color: creditAmount === amt ? "#FFF" : "var(--text-secondary)",
                        border: "1px solid var(--border-primary)",
                        cursor: "pointer"
                      }}
                    >
                      +{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculated Balance Preview */}
              {creditTargetUser && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "6px",
                    background: "#F0FDF4",
                    border: "1px solid #BBF7D0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "13px"
                  }}
                >
                  <span style={{ color: "#166534", fontWeight: "600" }}>Estimated New Balance:</span>
                  <strong style={{ color: "#16A34A", fontSize: "15px" }}>
                    ⚡{" "}
                    {(
                      creditMode === "add"
                        ? (creditTargetUser.credits || 0) + (parseInt(creditAmount, 10) || 0)
                        : parseInt(creditAmount, 10) || 0
                    ).toLocaleString()}{" "}
                    Credits
                  </strong>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  disabled={creditSubmitting}
                  onClick={() => setCreditModalOpen(false)}
                  className="admin-btn admin-btn--secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creditSubmitting}
                  className="admin-btn admin-btn--primary"
                  style={{ gap: "6px" }}
                >
                  <span>{creditSubmitting ? "Transferring..." : "⚡ Transfer Credits Now"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
