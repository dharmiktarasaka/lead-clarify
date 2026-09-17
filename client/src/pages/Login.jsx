import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "../firebase/config";
import logoImg from "../assets/logo.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setError("");
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      setError(
        "Firebase is not configured yet. Please add your VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, and VITE_FIREBASE_PROJECT_ID into client/.env"
      );
      return;
    }

    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      await loginWithGoogle({
        email: user.email,
        name: user.displayName,
        avatar: user.photoURL,
        uid: user.uid
      });
      navigate("/dashboard");
    } catch (err) {
      console.error("Google sign-in error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        setError("Sign-in cancelled.");
      } else if (err.code === "auth/popup-blocked") {
        setError("Pop-up blocked by browser. Please allow pop-ups for localhost.");
      } else {
        setError(err.response?.data?.message || err.message || "Google sign-in failed.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <img
            src={logoImg}
            alt="Leadsflar"
            style={{
              height: "46px",
              maxWidth: "210px",
              width: "auto",
              objectFit: "contain",
              marginBottom: "12px"
            }}
          />
          <h1>Welcome Back</h1>
          <p>Sign in to your Leadsflar account</p>
        </div>

        {error && (
          <div className="alert alert--danger">{error}</div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="btn btn--google btn--full"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            background: "#FFFFFF",
            color: "#1E293B",
            border: "1px solid #CBD5E1",
            borderRadius: "8px",
            padding: "10px 16px",
            fontSize: "14px",
            fontWeight: "600",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
            cursor: "pointer",
            width: "100%",
            transition: "all 0.15s ease",
            marginBottom: "16px"
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>{googleLoading ? "Signing in with Google..." : "Continue with Google"}</span>
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            margin: "14px 0 18px 0",
            color: "#94A3B8",
            fontSize: "12px",
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: "0.04em"
          }}
        >
          <div style={{ flex: 1, height: "1px", background: "#E2E8F0" }}></div>
          <span style={{ padding: "0 10px" }}>or continue with email</span>
          <div style={{ flex: 1, height: "1px", background: "#E2E8F0" }}></div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--full"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="auth-card__footer">
          Don't have an account?{" "}
          <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
