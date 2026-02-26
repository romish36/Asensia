const express = require('express');
const router = express.Router();
const transporterPaymentController = require('../controllers/transporterPaymentController');
const authMiddleware = require('../middlewares/authMiddleware');

// POST Payment
router.post('/', authMiddleware, transporterPaymentController.createTransporterPayment);

// GET All Payments
router.get("/", authMiddleware, transporterPaymentController.getPayments);

// GET totals for a transporter
router.get("/totals/:transporterId", authMiddleware, transporterPaymentController.getTransporterTotals);

// GET ledger for a transporter
router.get("/ledger/:transporterId", authMiddleware, transporterPaymentController.getTransporterLedger);

// UPDATE Payment
router.put("/:id", authMiddleware, transporterPaymentController.updateTransporterPayment);

// DELETE Payment
router.delete("/:id", authMiddleware, transporterPaymentController.deleteTransporterPayment);

module.exports = router;
