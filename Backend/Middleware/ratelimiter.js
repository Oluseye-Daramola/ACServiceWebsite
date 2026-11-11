const { rateLimit } = require("express-rate-limit");

const limiter = (windowMinutes, limit, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { success: false, message }
  });

// General limit for the whole API
const apiLimiter = limiter(15, 500, "Too many requests, please try again later");

// Brute-force protection on login
const authLimiter = limiter(15, 10, "Too many login attempts, please try again in 15 minutes");

// Spam protection on the public contact form
const enquiryLimiter = limiter(60, 5, "Too many enquiries submitted, please try again later");

// Forgot password: stops reset-email flooding
const forgotPasswordLimiter = limiter(15, 5, "Too many password reset requests, please try again in 15 minutes");

// Reset password: stops token guessing (separate count so using a link isn't blocked by the request for it)
const resetPasswordLimiter = limiter(15, 10, "Too many password reset attempts, please try again in 15 minutes");

module.exports = { apiLimiter, authLimiter, enquiryLimiter, forgotPasswordLimiter, resetPasswordLimiter };
