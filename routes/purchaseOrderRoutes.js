const express = require("express");
const router = express.Router();
const {
    createPurchaseOrder,
    getPurchaseOrders,
    getPurchaseOrderById,
    updatePurchaseOrder,
    deletePurchaseOrder
} = require("../controllers/purchaseOrderController");
const authMiddleware = require("../middlewares/authMiddleware");

const checkPermission = require("../middlewares/permissionMiddleware");

router.post("/", authMiddleware, checkPermission("Purchase Order", "add"), createPurchaseOrder);
router.get("/", authMiddleware, checkPermission("Purchase Order", "view"), getPurchaseOrders);
router.get("/:id", authMiddleware, checkPermission("Purchase Order", "view"), getPurchaseOrderById);
router.put("/:id", authMiddleware, checkPermission("Purchase Order", "update"), updatePurchaseOrder);
router.delete("/:id", authMiddleware, checkPermission("Purchase Order", "delete"), deletePurchaseOrder);

module.exports = router;
