const authorize = (...roles) => {
  return (req, res, next) => {

    const isBranchManager =
      req.user?.role === "Branch Manager" ||
      (roles.includes("Branch Manager") &&
        /^\s*branch\s*man?ager\s*$/i.test(req.user?.designation || ""));

    if (!roles.includes(req.user?.role) && !isBranchManager) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this resource.",
      });
    }

    next();
  };
};

export default authorize;