const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const ApiError = require("../Utils/apiError");
const { cloudinaryEnabled, apiUrl } = require("../Config/env");

// UPLOAD_DIR can be overridden (the test suite points it at a temp folder)
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads"));
const EXT = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

// Converts "data:image/png;base64,...." (what signature pads produce) to a buffer
const parseDataUrl = (dataUrl) => {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(dataUrl || "");
  if (!match) throw ApiError.badRequest("Signature must be a base64 PNG/JPEG/WEBP data URL");
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 2 * 1024 * 1024) throw ApiError.badRequest("Signature image is too large (max 2MB)");
  return { buffer, mimetype: match[1] };
};

const uploadToCloudinary = (buffer, folder) => {
  const cloudinary = require("../Config/cloudinary");
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: `ac-website/${folder}`, resource_type: "image" }, (err, result) =>
        err ? reject(err) : resolve(result.secure_url)
      )
      .end(buffer);
  });
};

const saveLocally = async (buffer, mimetype, folder) => {
  const dir = path.join(UPLOAD_DIR, folder);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${EXT[mimetype] || "png"}`;
  await fs.writeFile(path.join(dir, filename), buffer);
  return `${apiUrl}/uploads/${folder}/${filename}`;
};

// Saves an image and returns its public URL.
// Uses Cloudinary when credentials are set, otherwise the local /uploads folder.
const saveImage = async ({ buffer, mimetype }, folder) =>
  cloudinaryEnabled ? uploadToCloudinary(buffer, folder) : saveLocally(buffer, mimetype, folder);

const saveDataUrlImage = (dataUrl, folder) => saveImage(parseDataUrl(dataUrl), folder);

module.exports = { saveImage, saveDataUrlImage, UPLOAD_DIR };
