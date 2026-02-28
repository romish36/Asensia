const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // We will pass companyName in the body or use a default
        const companyName = req.body.companyName ? req.body.companyName.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'temp';
        const dir = path.join(__dirname, '..', 'uploads', 'companies', companyName);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname).toLowerCase());
    }
});

const upload = multer({ storage: storage });

module.exports = upload;
