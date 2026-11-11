const { Joi, phone } = require("./common");

const fields = {
  name: Joi.string().trim().min(2).max(100),
  email: Joi.string().email().allow(""),
  phone: phone(),
  address: Joi.string().trim().max(300).allow(""),
  city: Joi.string().trim().max(100).allow(""),
  notes: Joi.string().trim().max(2000).allow("")
};

const create = Joi.object({
  ...fields,
  name: fields.name.required(),
  phone: fields.phone.required()
});

const update = Joi.object(fields).min(1);

module.exports = { create, update };
