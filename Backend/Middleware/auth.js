const jwt = require("jsonwebtoken");
const User = require("../Models/User");
const ApiError = require("../Utils/apiError");
const asyncHandler = require("../Utils/asyncHandler");
const { jwtSecret } = require("../Config/env");

// Verifies the Bearer token and attaches the logged-in user to req.user
const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized("No token provided");

  const decoded = jwt.verify(token, jwtSecret);
  if (decoded.purpose) throw ApiError.unauthorized("Invalid token");

  const user = await User.findById(decoded.id);
  if (!user) throw ApiError.unauthorized("User no longer exists");
  // Password changed since this token was issued -> force a fresh login
  if ((decoded.tv || 0) !== (user.tokenVersion || 0)) {
    throw ApiError.unauthorized("Your password was changed. Please log in again");
  }
  if (!user.isActive) throw ApiError.forbidden("Your account has been deactivated");

  req.user = user;
  next();
});

module.exports = { protect };
