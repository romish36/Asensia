const express = require("express");
const router = express.Router();
const purchaseOrderPaymentController = require("../controllers/purchaseOrderPaymentController");
const authMiddleware = require("../middlewares/authMiddleware");

router.use(authMiddleware);

router.get("/", purchaseOrderPaymentController.getPayments);
router.post("/", purchaseOrderPaymentController.createPurchasePayment);
// GET totals for a seller
router.get("/totals/:sellerId", purchaseOrderPaymentController.getSellerTotals);

// GET ledger for a seller
router.get("/ledger/:sellerId", purchaseOrderPaymentController.getSellerLedger);

// UPDATE payment
router.put("/:id", purchaseOrderPaymentController.updatePurchasePayment);

// DELETE payment
router.delete("/:id", purchaseOrderPaymentController.deletePurchasePayment);

module.exports = router;
