const { Joi, objectId } = require("./common");

const part = Joi.object({
  name: Joi.string().trim().required(),
  quantity: Joi.number().integer().min(1).default(1)
});

const fields = {
  arrivalTime: Joi.date().iso(),
  departureTime: Joi.date().iso(),
  findings: Joi.string().trim().min(3).max(5000),
  workDone: Joi.string().trim().min(3).max(5000),
  partsUsed: Joi.array().items(part),
  recommendations: Joi.string().trim().max(5000).allow("")
};

const create = Joi.object({
  ...fields,
  serviceId: objectId().required(),
  findings: fields.findings.required(),
  workDone: fields.workDone.required()
});

const update = Joi.object(fields).min(1);

// signature: base64 data URL from a signature pad, e.g. "data:image/png;base64,iVBOR..."
const sign = Joi.object({
  signer: Joi.string().valid("technician", "client").required(),
  name: Joi.string().trim().min(2).max(100).required(),
  signature: Joi.string().pattern(/^data:image\/(png|jpeg|webp);base64,/).required().messages({
    "string.pattern.base": "signature must be a base64 image data URL"
  })
});

const sendEmail = Joi.object({
  email: Joi.string().email() // defaults to the client's email
});

module.exports = { create, update, sign, sendEmail };
