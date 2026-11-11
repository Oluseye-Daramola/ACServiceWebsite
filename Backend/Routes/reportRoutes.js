const express = require("express");
const ctrl = require("../Controllers/reportController");
const { protect } = require("../Middleware/auth");
const authorize = require("../Middleware/authorize");
const validate = require("../Middleware/validate");
const upload = require("../Middleware/upload");
const { idParam } = require("../Validators/common");
const v = require("../Validators/reportValidator");

const router = express.Router();
const technician = authorize("technician");

router.use(protect);

// Admin and technicians can view (technicians only their own)
router.get("/", ctrl.getReports);
router.get("/service/:id", validate({ params: idParam }), ctrl.getReportByService);
router.get("/:id", validate({ params: idParam }), ctrl.getReport);
router.get("/:id/pdf", validate({ params: idParam }), ctrl.downloadReportPdf);

// Admin emails the signed report PDF to the client
router.post("/:id/send-email", authorize("admin"), validate({ params: idParam, body: v.sendEmail }), ctrl.emailReport);

// Technician fills, edits and gets the report signed
router.post("/", technician, validate({ body: v.create }), ctrl.createReport);
router.patch("/:id", technician, validate({ params: idParam, body: v.update }), ctrl.updateReport);
router.post("/:id/photos", technician, validate({ params: idParam }), upload.array("photos", 10), ctrl.addPhotos);
router.post("/:id/sign", technician, validate({ params: idParam, body: v.sign }), ctrl.signReport);

module.exports = router;
