const express = require("express");
const router = express.Router();
const {
    createCustomer,
    getCustomers,
    updateCustomer,
    deleteCustomer,
    getCustomerById,
    getCustomerByCustomId
} = require("../controllers/customerController");
const authMiddleware = require("../middlewares/authMiddleware");

const checkPermission = require('../middlewares/permissionMiddleware');

router.post("/", authMiddleware, checkPermission("Customer", "add"), createCustomer);
router.get("/", authMiddleware, checkPermission("Customer", "view"), getCustomers);
router.get("/:id", authMiddleware, checkPermission("Customer", "view"), getCustomerById);
router.get("/by-customer-id/:id", authMiddleware, checkPermission("Customer", "view"), getCustomerByCustomId);
router.put("/:id", authMiddleware, checkPermission("Customer", "update"), updateCustomer);
router.delete("/:id", authMiddleware, checkPermission("Customer", "delete"), deleteCustomer);

module.exports = router;
