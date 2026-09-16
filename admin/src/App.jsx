import { Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminLeads from "./pages/AdminLeads";
import AdminActivity from "./pages/AdminActivity";
import AdminGeminiLive from "./pages/AdminGeminiLive";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<AdminLogin />} />

      <Route element={<AdminProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/users" element={<AdminUsers />} />
          <Route path="/leads" element={<AdminLeads />} />
          <Route path="/activity" element={<AdminActivity />} />
          <Route path="/gemini-live" element={<AdminGeminiLive />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
