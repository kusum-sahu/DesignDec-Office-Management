import apiClient from "./client";

export const authApi = {
  /**
   * Log in with employeeId and password
   */
  login: (data) => apiClient.post("/auth/login", data),

  /**
   * Log out and clear session cookie
   */
  logout: () => apiClient.post("/auth/logout"),

  /**
   * Get currently authenticated user details
   */
  getMe: () => apiClient.get("/auth/me"),

  /**
   * Change employee password
   */
  changePassword: (data) => apiClient.put("/auth/change-password", data),

  /**
   * Request OTP for password recovery
   */
  forgotPassword: (data) => apiClient.post("/auth/forgot-password", data),

  /**
   * Verify password recovery OTP
   */
  verifyOTP: (data) => apiClient.post("/auth/verify-otp", data),

  /**
   * Reset password with verified OTP
   */
  resetPassword: (data) => apiClient.post("/auth/reset-password", data),
};

export default authApi;
