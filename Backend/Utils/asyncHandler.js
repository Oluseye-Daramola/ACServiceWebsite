// Express 5 already forwards rejected promises to the error handler,
// but wrapping keeps controllers portable and explicit.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
