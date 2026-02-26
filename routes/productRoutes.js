const express = require("express");
const router = express.Router();
const { getProducts, createProduct, updateProduct, deleteProduct } = require("../controllers/productController");
const authMiddleware = require("../middlewares/authMiddleware");
const companyScopeMiddleware = require("../middlewares/companyScopeMiddleware");
const checkPermission = require("../middlewares/permissionMiddleware");
const Product = require("../models/productModel");

// Apply auth middleware and company scope, then check granular permissions
router.get("/", authMiddleware, companyScopeMiddleware(Product), checkPermission("Product", "view"), getProducts);

// Create product
router.post("/", authMiddleware, checkPermission("Product", "add"), createProduct);

// Update product
router.put("/:id", authMiddleware, checkPermission("Product", "update"), updateProduct);

// Delete product
router.delete("/:id", authMiddleware, checkPermission("Product", "delete"), deleteProduct);

module.exports = router;
