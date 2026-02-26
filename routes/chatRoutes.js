const express = require('express');
const router = express.Router();
const { getChatHistory, getChatPartners, markAsRead, getTotalUnreadCount } = require('../controllers/chatController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/history/:roomId', authMiddleware, getChatHistory);
router.get('/partners', authMiddleware, getChatPartners);
router.get('/unread-count', authMiddleware, getTotalUnreadCount);
router.put('/read/:roomId', authMiddleware, markAsRead);

module.exports = router;
