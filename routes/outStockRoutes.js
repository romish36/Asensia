const express = require('express');
const router = express.Router();
const outStockController = require('../controllers/outStockController');
const authMiddleware = require('../middlewares/authMiddleware');
const companyScopeMiddleware = require('../middlewares/companyScopeMiddleware');
const OutStock = require('../models/outStockModel');

const checkPermission = require('../middlewares/permissionMiddleware');

router.get('/', authMiddleware, companyScopeMiddleware(OutStock), checkPermission('OutStock', 'view'), outStockController.getOutStocks);
router.post('/', authMiddleware, checkPermission('OutStock', 'add'), outStockController.createOutStock);
router.put('/:id', authMiddleware, checkPermission('OutStock', 'update'), outStockController.updateOutStock);
router.delete('/:id', authMiddleware, checkPermission('OutStock', 'delete'), outStockController.deleteOutStock);

module.exports = router;
