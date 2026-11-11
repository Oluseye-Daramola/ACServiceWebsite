const ApiError = require("../Utils/apiError");

// Validates req.body / req.params against Joi schemas: validate({ body, params })
// Note: Express 5 makes req.query read-only, so query strings are parsed in controllers.
const validate = (schemas) => (req, _res, next) => {
  for (const key of ["params", "body"]) {
    if (!schemas[key]) continue;

    const { error, value } = schemas[key].validate(req[key] || {}, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const details = error.details.map((d) => ({ field: d.path.join("."), message: d.message.replace(/"/g, "") }));
      return next(ApiError.badRequest("Validation failed", details));
    }

    if (key === "body") req.body = value;
    else Object.assign(req.params, value);
  }
  next();
};

module.exports = validate;
