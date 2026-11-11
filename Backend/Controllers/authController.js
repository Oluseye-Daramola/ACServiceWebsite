const jwt = require("jsonwebtoken");
const User = require("../Models/User");
const ApiError = require("../Utils/apiError");
const asyncHandler = require("../Utils/asyncHandler");
const logger = require("../Utils/logger");
const { jwtSecret, jwtExpiresIn, clientUrl, nodeEnv } = require("../Config/env");
const { sendPasswordResetEmail, isConfigured: isEmailConfigured } = require("../Services/emailService");

// tv = token version; see Middleware/auth.js
const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role, tv: user.tokenVersion || 0 }, jwtSecret, { expiresIn: jwtExpiresIn });

// POST /api/auth/login  (admin and technicians use the same endpoint)
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) throw ApiError.unauthorized("Invalid email or password");
  if (!user.isActive) throw ApiError.forbidden("Your account has been deactivated. Contact the admin.");

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  res.json({ success: true, token: signToken(user), user });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

// PATCH /api/auth/me
const updateProfile = asyncHandler(async (req, res) => {
  Object.assign(req.user, req.body);
  await req.user.save();
  res.json({ success: true, user: req.user });
});

// PATCH /api/auth/change-password
const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.comparePassword(req.body.currentPassword))) {
    throw ApiError.badRequest("Current password is incorrect");
  }

  user.password = req.body.newPassword;
  await user.save();

  res.json({ success: true, message: "Password updated", token: signToken(user) });
});

// POST /api/auth/forgot-password  { email }
// Always gives the same reply so the endpoint can't be used to discover which emails have accounts.
const forgotPassword = asyncHandler(async (req, res) => {
  const reply = { success: true, message: "If an account exists for that email, a password reset link has been sent." };

  const user = await User.findOne({ email: req.body.email });
  if (!user || !user.isActive) return res.json(reply);

  const token = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // Frontend page that reads ?token= and calls POST /api/auth/reset-password
  const resetUrl = `${clientUrl.split(",")[0].trim()}/reset-password?token=${token}`;

  if (!isEmailConfigured()) {
    logger.warn(`Password reset requested for ${user.email} but SMTP is not configured; no email sent.`);
    if (nodeEnv === "development") logger.info(`[dev only] Reset link: ${resetUrl}`);
    return res.json(reply);
  }

  try {
    await sendPasswordResetEmail(user, resetUrl);
  } catch {
    // Already logged by the email service. Same reply either way, so the
    // endpoint never reveals whether the account exists.
  }
  res.json(reply);
});

// POST /api/auth/reset-password  { token, password }
const resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    passwordResetToken: User.hashResetToken(req.body.token),
    passwordResetExpires: { $gt: new Date() }
  }).select("+passwordResetToken +passwordResetExpires");
  if (!user) throw ApiError.badRequest("Invalid or expired reset link");
  if (!user.isActive) throw ApiError.forbidden("Your account has been deactivated. Contact the admin.");

  // Saving the new password also clears the reset token (single use)
  // and bumps tokenVersion, logging the user out on every other device.
  user.password = req.body.password;
  await user.save();

  res.json({ success: true, message: "Password has been reset. You are now logged in.", token: signToken(user), user });
});

module.exports = { login, getMe, updateProfile, changePassword, forgotPassword, resetPassword };
