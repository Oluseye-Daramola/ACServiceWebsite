const { Joi, objectId, phone } = require("./common");

const item = Joi.object({
  description: Joi.string().trim().min(2).max(300).required(),
  quantity: Joi.number().integer().min(1).required(),
  unitPrice: Joi.number().min(0).required()
});

const fields = {
  items: Joi.array().items(item).min(1),
  taxRate: Joi.number().min(0).max(100),
  discount: Joi.number().min(0),
  dueDate: Joi.date().iso(),
  notes: Joi.string().trim().max(2000).allow("")
};

const create = Joi.object({
  ...fields,
  serviceId: objectId().required(),
  items: fields.items.required()
});

const update = Joi.object(fields).min(1);

const sendEmail = Joi.object({
  email: Joi.string().email() // defaults to the client's email
});

const shareWhatsapp = Joi.object({
  phone: phone() // defaults to the client's phone
});

module.exports = { create, update, sendEmail, shareWhatsapp };
