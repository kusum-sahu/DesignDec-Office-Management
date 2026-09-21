import useAuthStore from "../stores/authStore";
import { ROLES } from "../constants/roles";

/**
 * Convenient hook to access auth store with role helpers
 */
export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    isActionLoading,
    forcePasswordChange,
    error,
    login,
    logout,
    checkAuth,
    clearError,
  } = useAuthStore();

  const isAdmin = user?.role === ROLES.ADMIN;
  const isBranchAdmin =
    user?.role === ROLES.BRANCH_ADMIN ||
    user?.role === "Branch Manager" ||
    (user?.role !== ROLES.ADMIN && /^\s*branch\s*(admin|man?ager)\s*$/i.test(user?.designation || ""));
  const isEmployee = !isAdmin && !isBranchAdmin;

  return {
    user,
    isAuthenticated,
    isLoading,
    isActionLoading,
    forcePasswordChange,
    error,
    isAdmin,
    isBranchAdmin,
    isBranchManager: isBranchAdmin, // backward compatibility
    isEmployee,
    login,
    logout,
    checkAuth,
    clearError,
  };
}

export default useAuth;
