const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, forgotPassword, resetPassword } = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', authMiddleware, getMe);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
