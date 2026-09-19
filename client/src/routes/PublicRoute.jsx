import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../stores/authStore";
import PageLoader from "../components/feedback/PageLoader";

export function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <PageLoader message="Connecting to DesignDec..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children ? children : <Outlet />;
}

export default PublicRoute;
