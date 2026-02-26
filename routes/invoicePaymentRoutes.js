const express = require("express");
const router = express.Router();
const invoicePaymentController = require("../controllers/invoicePaymentController");
const authMiddleware = require("../middlewares/authMiddleware");

// All routes require authentication
router.use(authMiddleware);

// GET all payments (can be filtered by ?customerId=...)
router.get("/", invoicePaymentController.getPayments);

// POST create payment
router.post("/", invoicePaymentController.createInvoicePayment);

// GET totals for a customer
router.get("/totals/:customerId", invoicePaymentController.getCustomerTotals);

// GET ledger for a customer
router.get("/ledger/:customerId", invoicePaymentController.getCustomerLedger);

// UPDATE payment
router.put("/:id", invoicePaymentController.updateInvoicePayment);

// DELETE payment
router.delete("/:id", invoicePaymentController.deleteInvoicePayment);

module.exports = router;
