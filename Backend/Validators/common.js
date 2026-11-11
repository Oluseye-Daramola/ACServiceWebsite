const Joi = require("joi");

const objectId = () => Joi.string().hex().length(24).messages({ "string.length": "{{#label}} must be a valid id" });

const idParam = Joi.object({ id: objectId().required() });

const phone = () => Joi.string().trim().pattern(/^\+?[\d\s()-]{7,20}$/).messages({
  "string.pattern.base": "{{#label}} must be a valid phone number"
});

module.exports = { Joi, objectId, idParam, phone };
