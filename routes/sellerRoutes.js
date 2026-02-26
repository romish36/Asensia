const express = require("express");
const router = express.Router();
const { createSeller, getSellers, updateSeller, deleteSeller, getSellerByCustomId } = require("../controllers/sellerController");
const authMiddleware = require("../middlewares/authMiddleware");

const checkPermission = require('../middlewares/permissionMiddleware');

router.use(authMiddleware);

router.post("/", checkPermission("Seller", "add"), createSeller);
router.get("/", checkPermission("Seller", "view"), getSellers);
router.put("/:id", checkPermission("Seller", "update"), updateSeller);
router.delete("/:id", checkPermission("Seller", "delete"), deleteSeller);
router.get("/by-seller-id/:id", checkPermission("Seller", "view"), getSellerByCustomId);

module.exports = router;
