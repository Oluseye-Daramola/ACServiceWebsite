const multer = require("multer");
const ApiError = require("../Utils/apiError");
const logger = require("../Utils/logger");
const { nodeEnv } = require("../Config/env");

const notFound = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let details = err.details;

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  } else if (err.name === "VersionError") {
    statusCode = 409;
    message = "This record was changed by another request. Reload it and try again.";
  } else if (err.code === 11000) {
    statusCode = 409;
    message = `Duplicate value for: ${Object.keys(err.keyValue || {}).join(", ")}`;
  } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    statusCode = 401;
    message = err.name === "TokenExpiredError" ? "Token expired, please log in again" : "Invalid token";
  } else if (err instanceof multer.MulterError) {
    statusCode = 400;
  } else if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Malformed JSON body";
  } else if (err.type === "entity.too.large") {
    statusCode = 413;
    message = "Request body too large";
  }

  // Only unexpected errors get a stack trace in the logs
  if (statusCode >= 500 && !(err instanceof ApiError)) logger.error(err);

  res.status(statusCode).json({
    success: false,
    message,
    ...(details && { details }),
    ...(nodeEnv === "development" && statusCode >= 500 && { stack: err.stack })
  });
};

module.exports = { notFound, errorHandler };
