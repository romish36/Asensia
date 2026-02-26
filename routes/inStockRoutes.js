const express = require('express');
const router = express.Router();
const inStockController = require('../controllers/inStockController');
const authMiddleware = require('../middlewares/authMiddleware');

const companyScopeMiddleware = require('../middlewares/companyScopeMiddleware');
const InStock = require('../models/inStockModel');

const checkPermission = require('../middlewares/permissionMiddleware');

router.get('/', authMiddleware, companyScopeMiddleware(InStock), checkPermission('InStock', 'view'), inStockController.getInStocks);
router.post('/', authMiddleware, checkPermission('InStock', 'add'), inStockController.createInStock);
router.put('/:id', authMiddleware, checkPermission('InStock', 'update'), inStockController.updateInStock);
router.delete('/:id', authMiddleware, checkPermission('InStock', 'delete'), inStockController.deleteInStock);

module.exports = router;
