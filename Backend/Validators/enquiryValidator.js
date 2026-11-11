const { Joi, objectId, phone } = require("./common");
const { SERVICE_TYPES, ENQUIRY_STATUSES } = require("../Models/Enquiry");
const { PRIORITIES } = require("../Models/Service");

// Public contact form
const create = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: phone().required(),
  address: Joi.string().trim().max(300).allow(""),
  serviceType: Joi.string().valid(...SERVICE_TYPES),
  message: Joi.string().trim().min(5).max(2000).required(),
  preferredDate: Joi.date().iso()
});

const updateStatus = Joi.object({
  status: Joi.string().valid("new", "contacted", "closed").required(),
  adminNotes: Joi.string().trim().max(2000).allow("")
});

// Turns an enquiry into a service. Uses an existing client if clientId is given,
// otherwise finds a client by email/phone or creates one from the enquiry details.
const convert = Joi.object({
  clientId: objectId(),
  title: Joi.string().trim().max(200),
  serviceType: Joi.string().valid(...SERVICE_TYPES),
  description: Joi.string().trim().max(2000),
  address: Joi.string().trim().max(300),
  scheduledDate: Joi.date().iso(),
  priority: Joi.string().valid(...PRIORITIES),
  technicianId: objectId(),
  adminNotes: Joi.string().trim().max(2000).allow("")
});

module.exports = { create, updateStatus, convert, ENQUIRY_STATUSES };
