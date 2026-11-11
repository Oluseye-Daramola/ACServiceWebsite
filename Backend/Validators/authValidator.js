const { Joi, phone } = require("./common");

const login = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const changePassword = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).invalid(Joi.ref("currentPassword")).required().messages({
    "any.invalid": "New password must be different from the current password"
  })
});

const updateProfile = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  phone: phone()
}).min(1);

const forgotPassword = Joi.object({
  email: Joi.string().email().required()
});

const resetPassword = Joi.object({
  token: Joi.string().pattern(/^[a-f0-9]{64}$/).required().messages({
    "string.pattern.base": "Invalid or expired reset link"
  }),
  password: Joi.string().min(8).required()
});

module.exports = { login, changePassword, updateProfile, forgotPassword, resetPassword };
