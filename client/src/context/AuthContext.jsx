import { createContext, useContext, useState, useEffect } from "react";
import { loginUser, registerUser, googleLoginUser, getMe } from "../services/api";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const { data } = await getMe();
      if (data?.user) {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      }
    } catch {
      // Silently fail if not logged in or token expired
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        refreshUser(); // fetch latest refilled credits from server
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setLoading(false);

    const handleCreditsUpdate = (e) => {
      if (typeof e.detail === "number") {
        setUser((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, credits: e.detail };
          localStorage.setItem("user", JSON.stringify(updated));
          return updated;
        });
      } else {
        refreshUser();
      }
    };

    // Auto-sync when returning to tab or window
    const handleFocus = () => {
      if (localStorage.getItem("token")) {
        refreshUser();
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("creditsUpdated", handleCreditsUpdate);

    // Periodic gentle credit sync every 30 seconds
    const interval = setInterval(() => {
      if (localStorage.getItem("token")) {
        refreshUser();
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("creditsUpdated", handleCreditsUpdate);
    };
  }, []);

  const login = async (email, password) => {
    const { data } = await loginUser({ email, password });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await registerUser({ name, email, password });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const loginWithGoogle = async (googleData) => {
    const { data } = await googleLoginUser(googleData);
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    loginWithGoogle,
    refreshUser,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
