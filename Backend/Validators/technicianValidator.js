const { Joi, phone } = require("./common");

const create = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: phone().required(),
  password: Joi.string().min(8).required(),
  specialization: Joi.string().trim().max(200).allow("")
});

const update = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  email: Joi.string().email(),
  phone: phone(),
  specialization: Joi.string().trim().max(200).allow(""),
  isActive: Joi.boolean()
}).min(1);

const resetPassword = Joi.object({
  password: Joi.string().min(8).required()
});

module.exports = { create, update, resetPassword };
