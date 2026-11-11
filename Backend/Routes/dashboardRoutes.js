const express = require("express");
const { getDashboard } = require("../Controllers/dashboardController");
const { protect } = require("../Middleware/auth");

const router = express.Router();

// Returns admin or technician stats depending on who is logged in
router.get("/", protect, getDashboard);

module.exports = router;
