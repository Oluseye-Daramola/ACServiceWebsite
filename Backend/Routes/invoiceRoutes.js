const express = require("express");
const ctrl = require("../Controllers/invoiceController");
const { protect } = require("../Middleware/auth");
const authorize = require("../Middleware/authorize");
const validate = require("../Middleware/validate");
const { idParam } = require("../Validators/common");
const v = require("../Validators/invoiceValidator");

const router = express.Router();

// Public: tokenised PDF link shared with the client via WhatsApp
router.get("/public/:id/pdf", validate({ params: idParam }), ctrl.publicPdf);

// Admin only
router.use(protect, authorize("admin"));

router.route("/").get(ctrl.getInvoices).post(validate({ body: v.create }), ctrl.createInvoice);
router
  .route("/:id")
  .get(validate({ params: idParam }), ctrl.getInvoice)
  .patch(validate({ params: idParam, body: v.update }), ctrl.updateInvoice);
router.patch("/:id/cancel", validate({ params: idParam }), ctrl.cancelInvoice);
router.get("/:id/pdf", validate({ params: idParam }), ctrl.downloadPdf);
router.post("/:id/send-email", validate({ params: idParam, body: v.sendEmail }), ctrl.emailInvoice);
router.post("/:id/share-whatsapp", validate({ params: idParam, body: v.shareWhatsapp }), ctrl.shareWhatsapp);

module.exports = router;
