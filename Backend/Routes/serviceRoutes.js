const express = require("express");
const ctrl = require("../Controllers/serviceController");
const { protect } = require("../Middleware/auth");
const authorize = require("../Middleware/authorize");
const validate = require("../Middleware/validate");
const { idParam } = require("../Validators/common");
const v = require("../Validators/serviceValidator");

const router = express.Router();
const admin = authorize("admin");
const technician = authorize("technician");

router.use(protect);

// Admin and technicians (technicians only see their own assigned services)
router.get("/", ctrl.getServices);
router.get("/:id", validate({ params: idParam }), ctrl.getService);

// Technician: start / complete their own job
router.patch("/:id/progress", technician, validate({ params: idParam, body: v.technicianStatus }), ctrl.updateServiceProgress);

// Admin only
router.post("/", admin, validate({ body: v.create }), ctrl.createService);
router.patch("/:id", admin, validate({ params: idParam, body: v.update }), ctrl.updateService);
router.patch("/:id/assign", admin, validate({ params: idParam, body: v.assign }), ctrl.assignService);
router.patch("/:id/status", admin, validate({ params: idParam, body: v.adminStatus }), ctrl.updateServiceStatus);
router.delete("/:id", admin, validate({ params: idParam }), ctrl.deleteService);

module.exports = router;
