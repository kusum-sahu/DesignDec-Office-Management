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
  const isBranchManager =
    user?.role === ROLES.BRANCH_MANAGER ||
    (user?.role !== ROLES.ADMIN && /^\s*branch\s*man?ager\s*$/i.test(user?.designation || ""));
  const isEmployee = !isAdmin && !isBranchManager;


  return {
    user,
    isAuthenticated,
    isLoading,
    isActionLoading,
    forcePasswordChange,
    error,
    isAdmin,
    isBranchManager,
    isEmployee,
    login,
    logout,
    checkAuth,
    clearError,
  };
}

export default useAuth;
