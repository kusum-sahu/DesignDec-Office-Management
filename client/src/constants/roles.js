export const ROLES = {
  ADMIN: "Admin",
  BRANCH_ADMIN: "Branch Admin",
  BRANCH_MANAGER: "Branch Admin", // Alias for backward compatibility
  EMPLOYEE: "Employee",
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: "Administrator",
  [ROLES.BRANCH_ADMIN]: "Branch Admin",
  [ROLES.EMPLOYEE]: "Employee",
};

export default ROLES;
