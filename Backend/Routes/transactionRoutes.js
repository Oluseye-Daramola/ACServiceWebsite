const express = require("express");
const ctrl = require("../Controllers/transactionController");
const { protect } = require("../Middleware/auth");
const authorize = require("../Middleware/authorize");
const validate = require("../Middleware/validate");
const { idParam } = require("../Validators/common");
const v = require("../Validators/transactionValidator");

const router = express.Router();

// Admin only: payments and transaction history
router.use(protect, authorize("admin"));

router.route("/").get(ctrl.getTransactions).post(validate({ body: v.create }), ctrl.recordPayment);
router.get("/summary", ctrl.getSummary);
router.get("/:id", validate({ params: idParam }), ctrl.getTransaction);
router.patch("/:id/reverse", validate({ params: idParam, body: v.reverse }), ctrl.reverseTransaction);

module.exports = router;
