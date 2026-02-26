const express = require("express");
const router = express.Router();
const {
    createSalesInvoice,
    getSalesInvoices,
    getSalesInvoiceById,
    updateSalesInvoice,
    deleteSalesInvoice
} = require("../controllers/salesInvoiceController");
const authMiddleware = require("../middlewares/authMiddleware");

const checkPermission = require("../middlewares/permissionMiddleware");

router.use(authMiddleware);

router.post("/", checkPermission("Invoice", "add"), createSalesInvoice);
router.get("/", checkPermission("Invoice", "view"), getSalesInvoices);
router.get("/:id", checkPermission("Invoice", "view"), getSalesInvoiceById);
router.put("/:id", checkPermission("Invoice", "update"), updateSalesInvoice);
router.delete("/:id", checkPermission("Invoice", "delete"), deleteSalesInvoice);

module.exports = router;
