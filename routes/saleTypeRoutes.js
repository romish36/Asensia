const express = require("express");
const router = express.Router();
const {
    createSaleType,
    getSaleTypes,
    updateSaleType,
    deleteSaleType
} = require("../controllers/saleTypeController");
const authMiddleware = require("../middlewares/authMiddleware");

const checkPermission = require('../middlewares/permissionMiddleware');

router.post("/", authMiddleware, checkPermission('SaleType', 'add'), createSaleType);
router.get("/", authMiddleware, checkPermission('SaleType', 'view'), getSaleTypes);
router.put("/:id", authMiddleware, checkPermission('SaleType', 'update'), updateSaleType);
router.delete("/:id", authMiddleware, checkPermission('SaleType', 'delete'), deleteSaleType);

module.exports = router;
