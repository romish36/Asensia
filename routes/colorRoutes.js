const express = require("express");
const router = express.Router();
const {
    createColor,
    getColors,
    updateColor,
    deleteColor
} = require("../controllers/colorController");
const authMiddleware = require("../middlewares/authMiddleware");

const checkPermission = require('../middlewares/permissionMiddleware');

router.post("/", authMiddleware, checkPermission('Color', 'add'), createColor);
router.get("/", authMiddleware, checkPermission('Color', 'view'), getColors);
router.put("/:id", authMiddleware, checkPermission('Color', 'update'), updateColor);
router.delete("/:id", checkPermission('Color', 'delete'), deleteColor);

module.exports = router;
