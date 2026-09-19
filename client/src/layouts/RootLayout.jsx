import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import useAuthStore from "../stores/authStore";
import Toaster from "../components/ui/Toaster";
import ErrorBoundary from "../components/feedback/ErrorBoundary";

// Configure TanStack Query Client with enterprise defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10,   // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function RootLayout() {
  const navigate = useNavigate();
  const { checkAuth } = useAuthStore();

  // Verify authentication session cookie on startup
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Handle unauthorized events dispatched by Axios interceptor
  useEffect(() => {
    const handleUnauthorized = () => {
      navigate("/login", { replace: true });
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, [navigate]);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Outlet />
        <Toaster />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default RootLayout;
