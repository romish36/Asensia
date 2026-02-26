const express = require("express");
const router = express.Router();
const { getPermissions } = require("../controllers/permissionsController");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/", authMiddleware, getPermissions);

module.exports = router;
