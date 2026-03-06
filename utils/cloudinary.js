const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');

// Configure Cloudinary
console.log('Initializing Cloudinary with cloud_name:', process.env.CLOUDINARY_CLOUD_NAME);
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


// Configure Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'asencia_chat',
        resource_type: 'auto',
        // removed allowed_formats as it can cause 500 errors with resource_type: 'auto' for non-image files
    }
});



// File validation
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'image/jpeg', 'image/png', 'image/jpg', 'image/gif',
        'video/mp4', 'video/webm', 'video/quicktime',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip', 'application/x-zip-compressed', 'application/octet-stream'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images, videos, documents and archives are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 11000000
    },
    fileFilter: fileFilter
});



module.exports = { upload, cloudinary };
