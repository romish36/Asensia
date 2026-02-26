const express = require('express');
const router = express.Router();
const bundleItemController = require('../controllers/bundleItemController');

router.get('/:productBundleId', bundleItemController.getBundleItems);
router.post('/', bundleItemController.addBundleItems);
router.delete('/:id', bundleItemController.deleteBundleItem);

module.exports = router;
