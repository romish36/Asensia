const express = require("express");
const router = express.Router();
const {
    createInvoiceName,
    getInvoiceNames,
    updateInvoiceName,
    deleteInvoiceName
} = require("../controllers/invoiceNameController");
const authMiddleware = require("../middlewares/authMiddleware");

const checkPermission = require('../middlewares/permissionMiddleware');

router.use(authMiddleware);

router.post("/", checkPermission('InvoiceName', 'add'), createInvoiceName);
router.get("/", checkPermission('InvoiceName', 'view'), getInvoiceNames);
router.put("/:id", checkPermission('InvoiceName', 'update'), updateInvoiceName);
router.delete("/:id", checkPermission('InvoiceName', 'delete'), deleteInvoiceName);

module.exports = router;
