const express = require("express");
const ctrl = require("../Controllers/clientController");
const { protect } = require("../Middleware/auth");
const authorize = require("../Middleware/authorize");
const validate = require("../Middleware/validate");
const { idParam } = require("../Validators/common");
const v = require("../Validators/clientValidator");

const router = express.Router();

router.use(protect, authorize("admin"));

router.route("/").get(ctrl.getClients).post(validate({ body: v.create }), ctrl.createClient);
router
  .route("/:id")
  .get(validate({ params: idParam }), ctrl.getClient)
  .patch(validate({ params: idParam, body: v.update }), ctrl.updateClient)
  .delete(validate({ params: idParam }), ctrl.deleteClient);

module.exports = router;
