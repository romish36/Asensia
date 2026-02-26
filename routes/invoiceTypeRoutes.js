const express = require("express");
const router = express.Router();
const { getInvoiceTypes } = require("../controllers/invoiceTypeController");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/", authMiddleware, getInvoiceTypes);

module.exports = router;
