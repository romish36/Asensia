const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use Cloudinary storage so files persist on live server (Render has ephemeral filesystem)
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const companyName = req.body.companyName
            ? req.body.companyName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
            : 'general';
        return {
            folder: `asencia_companies/${companyName}`,
            resource_type: 'auto',
            public_id: `${file.fieldname}_${Date.now()}`,
        };
    },
});

const upload = multer({ storage });

module.exports = upload;
