const express = require('express');
const router = express.Router();
const { getChatHistory, getChatPartners, markAsRead, getTotalUnreadCount, uploadFile, deleteMessage, editMessage } = require('../controllers/chatController');
const authMiddleware = require('../middlewares/authMiddleware');
const { cloudinary } = require('../utils/cloudinary');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Use Cloudinary storage for chat files so they persist on live server
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'asencia_chat',
        resource_type: 'auto'
    }
});

const uploadCloudinary = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }
});

router.get('/history/:roomId', authMiddleware, getChatHistory);
router.get('/partners', authMiddleware, getChatPartners);
router.get('/unread-count', authMiddleware, getTotalUnreadCount);
router.put('/read/:roomId', authMiddleware, markAsRead);

// File upload route - uses Cloudinary for persistent storage
router.post('/upload', authMiddleware, uploadCloudinary.single('file'), uploadFile);

router.delete('/delete/:messageId', authMiddleware, deleteMessage);
router.put('/edit/:messageId', authMiddleware, editMessage);

module.exports = router;
