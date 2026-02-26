const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
    saveUserPermissions,
    getUserPermissions,
    getPermissionMetadata
} = require('../controllers/userPermissionController');

// All routes require authentication
router.use(authMiddleware);

// Get metadata for permission UI (list of modules/actions)
router.get('/metadata', getPermissionMetadata);

// Save or Update permissions
router.post('/save', saveUserPermissions);

// Get permissions for a specific user
router.get('/:userId', getUserPermissions);

module.exports = router;
