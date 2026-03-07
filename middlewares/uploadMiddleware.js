const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { cloudinary } = require('../utils/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'asencia_companies',
        resource_type: 'auto',
    }
});

const upload = multer({ storage: storage });

module.exports = upload;
