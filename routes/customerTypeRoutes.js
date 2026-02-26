const express = require("express");
const router = express.Router();
const {
    createCustomerType,
    getCustomerTypes,
    updateCustomerType,
    deleteCustomerType
} = require("../controllers/customerTypeController");
const authMiddleware = require("../middlewares/authMiddleware");

const checkPermission = require('../middlewares/permissionMiddleware');

// All routes protected by auth
router.use(authMiddleware);

router.post("/", checkPermission('CustomerType', 'add'), createCustomerType);
router.get("/", checkPermission('CustomerType', 'view'), getCustomerTypes);
router.put("/:id", checkPermission('CustomerType', 'update'), updateCustomerType);
router.delete("/:id", checkPermission('CustomerType', 'delete'), deleteCustomerType);

module.exports = router;
