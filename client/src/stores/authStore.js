import { create } from "zustand";
import authApi from "../api/auth.api";
import { getErrorMessage } from "../utils/errorHandler";

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // initial auth verification loading
  isActionLoading: false,
  forcePasswordChange: false,
  error: null,

  /**
   * Check authentication on app mount via HTTP-only cookie
   */
  checkAuth: async () => {
    try {
      set({ isLoading: true, error: null });
      const res = await authApi.getMe();

      if (res?.success && res.user) {
        set({
          user: res.user,
          isAuthenticated: true,
          isLoading: false,
          forcePasswordChange: !res.user.isPasswordChanged,
        });
        return { success: true, user: res.user };
      }

      set({ user: null, isAuthenticated: false, isLoading: false });
      return { success: false };
    } catch {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null, // silent on initial load if not logged in
      });
      return { success: false };
    }
  },

  /**
   * Employee / Admin login
   */
  login: async (credentials) => {
    try {
      set({ isActionLoading: true, error: null });
      const res = await authApi.login(credentials);

      if (res?.success && res.user) {
        set({
          user: res.user,
          isAuthenticated: true,
          isActionLoading: false,
          forcePasswordChange: Boolean(res.forcePasswordChange),
          error: null,
        });
        return {
          success: true,
          user: res.user,
          forcePasswordChange: res.forcePasswordChange,
        };
      }

      throw new Error(res?.message || "Login failed");
    } catch (err) {
      const errMsg = getErrorMessage(err, "Invalid credentials or login failed.");
      set({ isActionLoading: false, error: errMsg });
      return { success: false, error: errMsg };
    }
  },

  /**
   * Logout employee
   */
  logout: async () => {
    try {
      set({ isActionLoading: true });
      await authApi.logout();
    } catch {
      // Continue clearing client state even if network call failed
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isActionLoading: false,
        forcePasswordChange: false,
        error: null,
      });
    }
  },

  /**
   * Update local user data
   */
  setUser: (userData) => set({ user: userData }),

  /**
   * Clear any stored errors
   */
  clearError: () => set({ error: null }),
}));

export default useAuthStore;
