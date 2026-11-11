const express = require("express");
const ctrl = require("../Controllers/authController");
const { protect } = require("../Middleware/auth");
const validate = require("../Middleware/validate");
const { authLimiter, forgotPasswordLimiter, resetPasswordLimiter } = require("../Middleware/ratelimiter");
const v = require("../Validators/authValidator");

const router = express.Router();

router.post("/login", authLimiter, validate({ body: v.login }), ctrl.login);
router.post("/forgot-password", forgotPasswordLimiter, validate({ body: v.forgotPassword }), ctrl.forgotPassword);
router.post("/reset-password", resetPasswordLimiter, validate({ body: v.resetPassword }), ctrl.resetPassword);

router.use(protect);
router.get("/me", ctrl.getMe);
router.patch("/me", validate({ body: v.updateProfile }), ctrl.updateProfile);
router.patch("/change-password", validate({ body: v.changePassword }), ctrl.changePassword);

module.exports = router;
