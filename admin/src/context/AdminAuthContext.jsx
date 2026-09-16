import { createContext, useContext, useState, useEffect } from "react";
import { adminLogin as apiLogin, getAdminMe } from "../services/api";

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminSession();
  }, []);

  const checkAdminSession = async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await getAdminMe();
      if (data.user?.role !== "admin") {
        throw new Error("Access restricted: Administrator role required.");
      }
      setAdmin(data.user);
    } catch (err) {
      console.warn("Session check failed:", err.message);
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data } = await apiLogin(email, password);
    if (data.user?.role !== "admin") {
      throw new Error("Access Denied: Only platform administrators can log in here.");
    }
    localStorage.setItem("admin_token", data.token);
    localStorage.setItem("admin_user", JSON.stringify(data.user));
    setAdmin(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    setAdmin(null);
  };

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => useContext(AdminAuthContext);
