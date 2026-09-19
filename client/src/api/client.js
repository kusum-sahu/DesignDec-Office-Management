import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // HTTP-only cookie transmission
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 30000,
});

// Response interceptor for consistent response data & error handling
apiClient.interceptors.response.use(
  (response) => {
    // Return standard response payload
    return response.data;
  },
  (error) => {
    // Check if error is 401 Unauthorized
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const isAuthPath =
        currentPath.startsWith("/login") ||
        currentPath.startsWith("/forgot-password") ||
        currentPath.startsWith("/reset-password");

      // Only dispatch session-expired event if user was attempting a protected route action
      if (!isAuthPath && !error.config?.url?.includes("/auth/me")) {
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
