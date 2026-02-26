const express = require("express");
const router = express.Router();
const {
    createPaymentMode,
    getPaymentModes,
    updatePaymentMode,
    deletePaymentMode
} = require("../controllers/paymentModeController");
const authMiddleware = require("../middlewares/authMiddleware");

const checkPermission = require('../middlewares/permissionMiddleware');

router.post("/", authMiddleware, checkPermission('PaymentMode', 'add'), createPaymentMode);
router.get("/", authMiddleware, checkPermission('PaymentMode', 'view'), getPaymentModes);
router.put("/:id", authMiddleware, checkPermission('PaymentMode', 'update'), updatePaymentMode);
router.delete("/:id", authMiddleware, checkPermission('PaymentMode', 'delete'), deletePaymentMode);

module.exports = router;
