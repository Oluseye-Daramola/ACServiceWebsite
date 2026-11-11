const multer = require("multer");
const ApiError = require("../Utils/apiError");

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

// Files are kept in memory and handed to Services/storage.js
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) cb(null, true);
    else cb(ApiError.badRequest("Only JPEG, PNG or WEBP images are allowed"));
  }
});

module.exports = upload;
