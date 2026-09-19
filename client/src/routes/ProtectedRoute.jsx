import { Navigate, useLocation, Outlet } from "react-router-dom";
import useAuthStore from "../stores/authStore";
import PageLoader from "../components/feedback/PageLoader";

export function ProtectedRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, isLoading, forcePasswordChange, user } = useAuthStore();

  if (isLoading) {
    return <PageLoader message="Verifying authentication session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Force employee to change temporary password before accessing other features
  const mustChangePassword = forcePasswordChange || user?.isPasswordChanged === false;
  if (mustChangePassword && location.pathname !== "/profile") {
    return <Navigate to="/profile#security" replace />;
  }

  return children ? children : <Outlet />;
}

export default ProtectedRoute;
