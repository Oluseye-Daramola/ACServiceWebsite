const { Joi, objectId } = require("./common");
const { SERVICE_TYPES } = require("../Models/Enquiry");
const { PRIORITIES } = require("../Models/Service");

const acUnit = Joi.object({
  brand: Joi.string().trim().allow(""),
  model: Joi.string().trim().allow(""),
  type: Joi.string().trim().allow(""),
  capacity: Joi.string().trim().allow(""),
  location: Joi.string().trim().allow("")
});

const fields = {
  clientId: objectId(),
  title: Joi.string().trim().min(3).max(200),
  serviceType: Joi.string().valid(...SERVICE_TYPES),
  description: Joi.string().trim().max(2000).allow(""),
  address: Joi.string().trim().max(300).allow(""),
  acUnits: Joi.array().items(acUnit),
  scheduledDate: Joi.date().iso(),
  priority: Joi.string().valid(...PRIORITIES),
  adminNotes: Joi.string().trim().max(2000).allow("")
};

const create = Joi.object({
  ...fields,
  clientId: fields.clientId.required(),
  title: fields.title.required(),
  serviceType: fields.serviceType.required(),
  technicianId: objectId()
});

const update = Joi.object(fields).min(1);

const assign = Joi.object({
  technicianId: objectId().required()
});

// Admin can cancel/reopen; technicians move their job through in_progress -> completed
const adminStatus = Joi.object({
  status: Joi.string().valid("pending", "assigned", "in_progress", "completed", "cancelled").required()
});

const technicianStatus = Joi.object({
  status: Joi.string().valid("in_progress", "completed").required(),
  technicianNotes: Joi.string().trim().max(2000).allow("")
});

module.exports = { create, update, assign, adminStatus, technicianStatus };
