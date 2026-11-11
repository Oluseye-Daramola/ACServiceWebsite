const { Joi, objectId } = require("./common");
const { PAYMENT_METHODS } = require("../Models/Transaction");

const create = Joi.object({
  invoiceId: objectId().required(),
  amount: Joi.number().positive().precision(2).required(),
  method: Joi.string().valid(...PAYMENT_METHODS).required(),
  paymentRef: Joi.string().trim().max(100).allow(""),
  paidAt: Joi.date().iso(),
  notes: Joi.string().trim().max(1000).allow("")
});

const reverse = Joi.object({
  reason: Joi.string().trim().min(3).max(500).required()
});

module.exports = { create, reverse };
