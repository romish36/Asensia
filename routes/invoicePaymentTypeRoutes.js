const express = require("express");
const router = express.Router();
const { getInvoicePaymentTypes } = require("../controllers/invoicePaymentTypeController");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/", authMiddleware, getInvoicePaymentTypes);

module.exports = router;
