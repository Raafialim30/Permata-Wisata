import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem("token");
  const storedRole = localStorage.getItem("role");
  const userData = localStorage.getItem("user");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  let userRole = (storedRole || "").toLowerCase();
  if (!userRole && userData) {
    try {
      const user = JSON.parse(userData);
      userRole = String(user?.role || "").toLowerCase();
    } catch (e) {
      userRole = "";
    }
  }

  if (allowedRole && userRole !== String(allowedRole).toLowerCase()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;