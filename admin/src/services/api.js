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

// Attach token to outgoing requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept 401/403 to auto clear expired tokens
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// -------------------------------------------------------------
// Admin API Endpoints
// -------------------------------------------------------------
export const adminLogin = (email, password) =>
  api.post("/auth/login", { email, password });

export const getAdminMe = () => api.get("/auth/me");

export const getAdminStats = () => api.get("/admin/stats");

export const getAdminUsers = (params) => api.get("/admin/users", { params });

export const getAdminUserById = (id) => api.get(`/admin/users/${id}`);

export const updateAdminUserStatus = (id, status) =>
  api.patch(`/admin/users/${id}/status`, { status });

export const updateAdminUserRole = (id, role) =>
  api.patch(`/admin/users/${id}/role`, { role });

export const updateAdminUserCredits = (id, data) =>
  api.patch(`/admin/users/${id}/credits`, data);

export const sendAdminCreditsLookup = (data) =>
  api.post("/admin/users/send-credits", data);

export const deleteAdminUser = (id) => api.delete(`/admin/users/${id}`);

export const getAdminGlobalLeads = (params) =>
  api.get("/admin/leads", { params });

export const getAdminLoginLogs = () => api.get("/admin/logins");

// Google Gemini AI Live Diagnostics & Use Cases
export const getAdminGeminiStatus = () => api.get("/admin/gemini/status");
export const testAdminGeminiPing = (data) => api.post("/admin/gemini/ping", data);
export const testAdminGeminiLiveAudit = (data) => api.post("/admin/gemini/live-audit", data);

export default api;
