const express = require("express");
const router = express.Router();
const { getInvoiceCopies, createInvoiceCopy, updateInvoiceCopy, deleteInvoiceCopy } = require("../controllers/invoiceCopyController");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/", authMiddleware, getInvoiceCopies);
router.post("/", authMiddleware, createInvoiceCopy);
router.put("/:id", authMiddleware, updateInvoiceCopy);
router.delete("/:id", authMiddleware, deleteInvoiceCopy);

module.exports = router;
