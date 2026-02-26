const express = require('express');
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/permissionMiddleware');

router.get('/', authMiddleware, checkPermission('Category', 'view'), getCategories);
router.post('/', authMiddleware, checkPermission('Category', 'add'), createCategory);
router.put('/:id', authMiddleware, checkPermission('Category', 'update'), updateCategory);
router.delete('/:id', authMiddleware, checkPermission('Category', 'delete'), deleteCategory);

module.exports = router;
