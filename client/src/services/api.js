import axios from "axios";

const getApiBaseUrl = () => {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || "").trim();
  if (!envUrl) return "http://localhost:5000/api";
  const cleanUrl = envUrl.replace(/\/+$/, "");
  return cleanUrl.endsWith("/api") ? cleanUrl : `${cleanUrl}/api`;
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle responses globally & sync credits in real time
api.interceptors.response.use(
  (response) => {
    if (response?.data && typeof response.data.remainingCredits === "number") {
      window.dispatchEvent(
        new CustomEvent("creditsUpdated", { detail: response.data.remainingCredits })
      );
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    if (error.response?.data && typeof error.response.data.remainingCredits === "number") {
      window.dispatchEvent(
        new CustomEvent("creditsUpdated", { detail: error.response.data.remainingCredits })
      );
    }
    return Promise.reject(error);
  }
);

// Auth
export const loginUser = (data) => api.post("/auth/login", data);
export const registerUser = (data) => api.post("/auth/register", data);
export const googleLoginUser = (data) => api.post("/auth/google", data);
export const getMe = () => api.get("/auth/me");

// Leads
export const getLeads = (params) => api.get("/leads", { params });
export const getLeadById = (id) => api.get(`/leads/${id}`);
export const createLead = (data) => api.post("/leads", data);
export const updateLead = (id, data) => api.put(`/leads/${id}`, data);
export const deleteLead = (id) => api.delete(`/leads/${id}`);
export const deleteBatchLeads = (data) => api.post("/leads/delete-batch", data);
export const importCSVLeads = (leads, fileName) => api.post("/leads/import-csv", { leads, fileName });

// Scraps & Folder Management
export const getScrapFolders = () => api.get("/leads/scraps/folders");
export const getScraps = (params) => api.get("/leads/scraps", { params });
export const recoverSingleScrap = (id) => api.post(`/leads/scraps/recover/${id}`);
export const recoverBatchScraps = (data) => api.post("/leads/scraps/recover-batch", data);
export const deleteSingleScrap = (id) => api.delete(`/leads/scraps/${id}`);
export const deleteBatchScraps = (data) => api.delete("/leads/scraps/batch", { data });

// Verified Lead Intelligence
export const verifyLead = (id, force = false) => api.post(`/leads/${id}/verify`, { force });
export const bulkVerifyLeads = (data) => {
  const leadIds = Array.isArray(data) ? data : (data?.leadIds || data);
  return api.post("/leads/bulk-verify", { leadIds });
};
export const getLeadVerification = (id) => api.get(`/leads/${id}/verification`);
export const applyLeadEvidence = (id, field, value) => api.post(`/leads/${id}/apply-evidence`, { field, value });

// AI & Web Enrichment
export const analyzeLead = (id) => api.post(`/ai/analyze-lead/${id}`);
export const analyzeBatchLeads = (data) => api.post("/ai/analyze-batch", data || {});
export const enrichLead = (id) => api.post(`/leads/${id}/enrich`);
export const enrichBatchLeads = (data) => api.post("/leads/enrich-batch", data || {});

export default api;
