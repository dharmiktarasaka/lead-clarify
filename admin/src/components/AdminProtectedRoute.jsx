import { Navigate, Outlet } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";

const AdminProtectedRoute = () => {
  const { admin, loading } = useAdminAuth();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--admin-bg)", color: "var(--text-secondary)" }}>
        <p>Verifying administrator credentials...</p>
      </div>
    );
  }

  if (!admin || admin.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default AdminProtectedRoute;
