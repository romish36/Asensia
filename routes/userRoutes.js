const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
    getAllUsers,
    getUserProfile,
    updateUserProfile,
    createUser,
    updateUser,
    deleteUser
} = require('../controllers/userController');

const checkPermission = require('../middlewares/permissionMiddleware');

// Protect all routes
router.use(authMiddleware);

router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile); // Self-update does not need specific permission, just auth
router.get('/', checkPermission('User', 'view'), getAllUsers);
router.post('/', checkPermission('User', 'add'), createUser);
router.put('/:id', checkPermission('User', 'update'), updateUser);
router.delete('/:id', checkPermission('User', 'delete'), deleteUser);

module.exports = router;
