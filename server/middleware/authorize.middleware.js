const authorize = (...roles) => {
  return (req, res, next) => {

    const userRole = req.user?.role;
    const isBranchRoleAllowed = roles.includes("Branch Admin") || roles.includes("Branch Manager");
    const isUserBranchAdminOrManager =
      userRole === "Branch Admin" ||
      userRole === "Branch Manager" ||
      (isBranchRoleAllowed && /^\s*branch\s*(admin|man?ager)\s*$/i.test(req.user?.designation || ""));

    // Check if user role matches or user is Branch Admin/Manager when branch role is allowed
    const isAuthorized =
      roles.includes(userRole) ||
      (isBranchRoleAllowed && isUserBranchAdminOrManager);

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this resource.",
      });
    }

    next();
  };
};

export default authorize;