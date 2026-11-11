const express = require("express");
const ctrl = require("../Controllers/technicianController");
const { protect } = require("../Middleware/auth");
const authorize = require("../Middleware/authorize");
const validate = require("../Middleware/validate");
const { idParam } = require("../Validators/common");
const v = require("../Validators/technicianValidator");

const router = express.Router();

// Admin manages technician (sub-admin) accounts
router.use(protect, authorize("admin"));

router.route("/").get(ctrl.getTechnicians).post(validate({ body: v.create }), ctrl.createTechnician);
router
  .route("/:id")
  .get(validate({ params: idParam }), ctrl.getTechnician)
  .patch(validate({ params: idParam, body: v.update }), ctrl.updateTechnician)
  .delete(validate({ params: idParam }), ctrl.deactivateTechnician);
router.patch("/:id/reset-password", validate({ params: idParam, body: v.resetPassword }), ctrl.resetPassword);

module.exports = router;
