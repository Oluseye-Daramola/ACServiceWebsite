const express = require("express");
const ctrl = require("../Controllers/enquiryController");
const { protect } = require("../Middleware/auth");
const authorize = require("../Middleware/authorize");
const validate = require("../Middleware/validate");
const { enquiryLimiter } = require("../Middleware/ratelimiter");
const { idParam } = require("../Validators/common");
const v = require("../Validators/enquiryValidator");

const router = express.Router();

// Public: contact form on the website
router.post("/", enquiryLimiter, validate({ body: v.create }), ctrl.createEnquiry);

// Admin only
router.use(protect, authorize("admin"));
router.get("/", ctrl.getEnquiries);
router.get("/:id", validate({ params: idParam }), ctrl.getEnquiry);
router.patch("/:id/status", validate({ params: idParam, body: v.updateStatus }), ctrl.updateEnquiryStatus);
router.post("/:id/convert", validate({ params: idParam, body: v.convert }), ctrl.convertEnquiry);
router.delete("/:id", validate({ params: idParam }), ctrl.deleteEnquiry);

module.exports = router;
