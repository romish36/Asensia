const express = require('express');
const path = require('path');
const router = express.Router();
const { getChatHistory, getChatPartners, markAsRead, getTotalUnreadCount, uploadFile, deleteMessage, editMessage } = require('../controllers/chatController');
const authMiddleware = require('../middlewares/authMiddleware');
const { cloudinary } = require('../utils/cloudinary');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'asencia_chat',
        resource_type: 'auto'
    }
});

const storageLocal = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'uploads', 'chat');
        if (!require('fs').existsSync(dir)) require('fs').mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const uploadLocal = multer({
    storage: storageLocal,
    limits: { fileSize: 100 * 1024 * 1024 }
});




router.get('/history/:roomId', authMiddleware, getChatHistory);
router.get('/partners', authMiddleware, getChatPartners);
router.get('/unread-count', authMiddleware, getTotalUnreadCount);
router.put('/read/:roomId', authMiddleware, markAsRead);

// File upload route
router.post('/upload', authMiddleware, uploadLocal.single('file'), uploadFile);


router.delete('/delete/:messageId', authMiddleware, deleteMessage);
router.put('/edit/:messageId', authMiddleware, editMessage);

module.exports = router;

