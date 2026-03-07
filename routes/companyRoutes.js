const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');
const {
    getCompanyById,
    getAllCompanies,
    createCompany,
    updateCompany,
    deleteCompany,
    getPlanStatus
} = require('../controllers/companyController');

const uploadFields = upload.fields([
    { name: 'companyLogoImage', maxCount: 1 },
    { name: 'companyLetterHeadHeaderImage', maxCount: 1 },
    { name: 'companyLetterHeadFooterImage', maxCount: 1 },
    { name: 'companyDigitalSignature', maxCount: 1 }
]);

// All routes require authentication
router.use(authMiddleware);

// Get all companies (SUPER_ADMIN only)
router.get('/', getAllCompanies);

// Create new company (SUPER_ADMIN only)
router.post('/', uploadFields, createCompany);

// Get company by ID
router.get('/:id', getCompanyById);

// Update company
router.put('/:id', uploadFields, updateCompany);

// Delete company
router.delete('/:id', deleteCompany);

// Get plan status for a company
router.get('/:id/plan-status', getPlanStatus);

module.exports = router;
