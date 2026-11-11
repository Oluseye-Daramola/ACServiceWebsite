const ApiError = require("../Utils/apiError");

// Usage: authorize("admin") or authorize("admin", "technician")
const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return next(ApiError.forbidden());
    next();
  };

module.exports = authorize;
