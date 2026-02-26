const express = require("express");
const router = express.Router();
const { createExpense, getExpenses, updateExpense, deleteExpense } = require("../controllers/expenseController");
const authMiddleware = require("../middlewares/authMiddleware");
const checkPermission = require("../middlewares/permissionMiddleware");

router.get("/", authMiddleware, checkPermission("Expense", "view"), getExpenses);
router.post("/", authMiddleware, checkPermission("Expense", "add"), createExpense);
router.put("/:id", authMiddleware, checkPermission("Expense", "update"), updateExpense);
router.delete("/:id", authMiddleware, checkPermission("Expense", "delete"), deleteExpense);

module.exports = router;
