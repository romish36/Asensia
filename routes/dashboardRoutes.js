const express = require("express");
const router = express.Router();
const { getDashboardStats } = require("../controllers/dashboardController");
const authMiddleware = require("../middlewares/authMiddleware");

router.use(authMiddleware);

router.get("/stats", getDashboardStats);

module.exports = router;
