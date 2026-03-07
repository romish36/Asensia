const Company = require('../models/companyModel');
const Plan = require('../models/planModel');
const Coupon = require('../models/couponModel');
const CouponUsage = require('../models/couponUsageModel');

// @desc    Get company by ID
// @route   GET /api/company/:id
// @access  Private
const getCompanyById = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id).select('-__v');

        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        res.status(200).json(company);
    } catch (error) {
        console.error('Get Company Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all companies (SUPER_ADMIN only)
// @route   GET /api/company
// @access  Private (SUPER_ADMIN)
const getAllCompanies = async (req, res) => {
    try {
        let query = {};
        const { search, page, limit } = req.query;

        // If user is not SUPER_ADMIN, they can only see their own company
        if (req.user.role !== 'SUPER_ADMIN') {
            if (!req.user.companyId) {
                return res.status(200).json([]);
            }
            query = { _id: req.user.companyId };
        }

        if (search) {
            query.$or = [
                { companyName: { $regex: search, $options: 'i' } },
                { companyPersonName: { $regex: search, $options: 'i' } },
                { companyEmail: { $regex: search, $options: 'i' } },
                { companyGstNumber: { $regex: search, $options: 'i' } }
            ];
        }

        if (!page && !limit) {
            const companies = await Company.find(query).select('-__v').sort({ createdAt: -1 });
            return res.status(200).json(companies);
        }

        const currentPage = parseInt(page) || 1;
        const currentLimit = parseInt(limit) || 10;
        const skip = (currentPage - 1) * currentLimit;

        const [companies, total] = await Promise.all([
            Company.find(query).select('-__v').sort({ createdAt: -1 }).skip(skip).limit(currentLimit),
            Company.countDocuments(query)
        ]);

        res.status(200).json({
            companies,
            total,
            page: currentPage,
            pages: Math.ceil(total / currentLimit)
        });
    } catch (error) {
        console.error('Get All Companies Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create new company (SUPER_ADMIN only)
// @route   POST /api/company
// @access  Private (SUPER_ADMIN)
// Get next ID
const getNextId = async () => {
    const lastDoc = await Company.findOne().sort({ companyId: -1 });
    return lastDoc && lastDoc.companyId ? lastDoc.companyId + 1 : 1;
};

// @desc    Create new company (SUPER_ADMIN only)
// @route   POST /api/company
// @access  Private (SUPER_ADMIN)
const createCompany = async (req, res) => {
    try {
        // Check if user is SUPER_ADMIN
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Access denied. SUPER_ADMIN only.' });
        }

        const companyData = { ...req.body };

        // Clean up data - FormData sends everything as strings
        const sanitizeNumber = (val, defaultVal = 0) => {
            if (val === '' || val === 'null' || val === 'undefined' || val === null || val === undefined) return defaultVal;
            const parsed = Number(val);
            return isNaN(parsed) ? defaultVal : parsed;
        };

        // Handle File Uploads (Cloudinary)
        if (req.files) {
            Object.keys(req.files).forEach(key => {
                if (req.files[key] && req.files[key][0]) {
                    const file = req.files[key][0];
                    companyData[key] = file.path; // Cloudinary URL
                }
            });
        }

        if (!companyData.companyName) {
            return res.status(400).json({ message: 'Company Name is required' });
        }

        // Check if company email already exists
        if (companyData.companyEmail && companyData.companyEmail !== 'null' && companyData.companyEmail !== '') {
            const existingCompany = await Company.findOne({ companyEmail: companyData.companyEmail });
            if (existingCompany) {
                return res.status(400).json({ message: 'Company with this email already exists' });
            }
        }

        // Generate next companyId
        const nextId = await getNextId();
        companyData.companyId = nextId;

        // Sanitize numeric fields
        companyData.countryId = sanitizeNumber(companyData.countryId, null);
        companyData.stateId = sanitizeNumber(companyData.stateId, null);
        companyData.cityId = sanitizeNumber(companyData.cityId, null);
        companyData.companyBackground = sanitizeNumber(companyData.companyBackground, 1);

        // Handle Plan
        if (companyData.planId && companyData.planId !== 'null' && companyData.planId !== '') {
            const plan = await Plan.findById(companyData.planId);
            if (plan) {
                const startDate = companyData.planStartDate && companyData.planStartDate !== 'null' ? new Date(companyData.planStartDate) : new Date();

                let expiryDate;
                if (companyData.planExpiryDate && companyData.planExpiryDate !== 'null') {
                    expiryDate = new Date(companyData.planExpiryDate);
                } else {
                    expiryDate = new Date(startDate);
                    expiryDate.setDate(expiryDate.getDate() + (plan.planDurationDays || 0));
                }

                companyData.planName = plan.planName;
                companyData.planDurationDays = plan.planDurationDays;
                companyData.planPrice = sanitizeNumber(plan.planPrice, 0);
                companyData.planDiscount = sanitizeNumber(plan.planDiscount, 0);

                let calculatedPrice = companyData.planPrice * (1 - (companyData.planDiscount / 100));
                let couponDiscount = 0;

                if (companyData.couponCode && companyData.couponCode !== 'null' && companyData.couponCode !== '') {
                    const now = new Date();
                    const coupon = await Coupon.findOne({ couponCode: companyData.couponCode.toUpperCase(), isActive: true });

                    if (coupon && now >= new Date(coupon.validFrom) && now <= new Date(coupon.validTo)) {
                        if (coupon.discountType === 'percentage') {
                            couponDiscount = calculatedPrice * (coupon.discountValue / 100);
                        } else {
                            couponDiscount = coupon.discountValue;
                        }
                        companyData.couponDiscountAmount = couponDiscount;
                        calculatedPrice -= couponDiscount;
                    }
                }

                companyData.finalPrice = Math.max(0, calculatedPrice);
                companyData.planStartDate = startDate;
                companyData.planExpiryDate = expiryDate;
            }
        } else {
            companyData.planId = null;
            companyData.planName = '';
            companyData.planDurationDays = null;
            companyData.planPrice = 0;
            companyData.planDiscount = 0;
            companyData.finalPrice = 0;
            companyData.planStartDate = null;
            companyData.planExpiryDate = null;
        }

        if (companyData.isActive === undefined) companyData.isActive = true;

        const company = await Company.create(companyData);

        // Record coupon usage
        if (companyData.couponCode && companyData.couponCode !== 'null' && companyData.couponCode !== '') {
            try {
                const coupon = await Coupon.findOne({ couponCode: companyData.couponCode.toUpperCase() });
                if (coupon) {
                    await CouponUsage.create({
                        couponId: coupon._id,
                        companyId: company._id,
                        planId: company.planId,
                        discountAmount: companyData.couponDiscountAmount || 0,
                        finalPrice: company.finalPrice || 0
                    });
                }
            } catch (cError) {
                console.error('Coupon usage record error:', cError);
            }
        }

        res.status(201).json(company);
    } catch (error) {
        console.error('Create Company Detailed Error:', error);
        res.status(500).json({
            message: 'Internal Server Error during company creation',
            error: error.message
        });
    }
};

// @desc    Update company
// @route   PUT /api/company/:id
// @access  Private (SUPER_ADMIN or company ADMIN)
const updateCompany = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || id === 'undefined' || id === 'null') {
            return res.status(400).json({ message: 'Valid Company ID is required' });
        }

        const company = await Company.findById(id);

        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        // Check permissions
        if (req.user.role !== 'SUPER_ADMIN' && req.user.companyId?.toString() !== id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const updateData = { ...req.body };

        // Clean up data - FormData sends everything as strings
        const sanitizeNumber = (val, defaultVal = 0) => {
            if (val === '' || val === 'null' || val === 'undefined' || val === null || val === undefined) return defaultVal;
            const parsed = Number(val);
            return isNaN(parsed) ? defaultVal : parsed;
        };

        const sanitizeString = (val) => {
            if (val === 'null' || val === 'undefined' || val === '') return null;
            return val;
        };

        // Numeric fields sanitization
        updateData.companyBackground = sanitizeNumber(updateData.companyBackground, 1);
        updateData.countryId = sanitizeNumber(updateData.countryId, null);
        updateData.stateId = sanitizeNumber(updateData.stateId, null);
        updateData.cityId = sanitizeNumber(updateData.cityId, null);

        // Plan numeric fields
        updateData.planPrice = sanitizeNumber(updateData.planPrice, 0);
        updateData.planDiscount = sanitizeNumber(updateData.planDiscount, 0);
        updateData.planDurationDays = sanitizeNumber(updateData.planDurationDays, null);
        updateData.couponDiscountAmount = sanitizeNumber(updateData.couponDiscountAmount, 0);
        updateData.finalPrice = sanitizeNumber(updateData.finalPrice, 0);

        // Plan ID sanitization
        if (updateData.planId === '' || updateData.planId === 'null' || updateData.planId === 'undefined') {
            updateData.planId = null;
        }

        // Handle File Uploads (Cloudinary)
        if (req.files) {
            Object.keys(req.files).forEach(key => {
                if (req.files[key] && req.files[key][0]) {
                    const file = req.files[key][0];
                    updateData[key] = file.path; // Cloudinary URL
                }
            });
        }

        // Handle Plan logic only if planId is provided and changed or newly set
        if (updateData.planId) {
            try {
                const plan = await Plan.findById(updateData.planId);
                if (plan) {
                    let startDate;
                    if (updateData.planStartDate && updateData.planStartDate !== 'null') {
                        startDate = new Date(updateData.planStartDate);
                    } else {
                        const existingPlanId = company.planId ? company.planId.toString() : null;
                        if (existingPlanId !== updateData.planId.toString()) {
                            startDate = new Date();
                        } else {
                            startDate = company.planStartDate ? new Date(company.planStartDate) : new Date();
                        }
                    }

                    let expiryDate;
                    if (updateData.planExpiryDate && updateData.planExpiryDate !== 'null') {
                        expiryDate = new Date(updateData.planExpiryDate);
                    } else {
                        expiryDate = new Date(startDate);
                        expiryDate.setDate(expiryDate.getDate() + (plan.planDurationDays || 0));
                    }

                    updateData.planName = plan.planName;
                    updateData.planDurationDays = plan.planDurationDays;
                    updateData.planStartDate = startDate;
                    updateData.planExpiryDate = expiryDate;
                }
            } catch (pError) {
                console.error('Plan lookup error during update:', pError);
                // Continue with update even if plan lookup fails
            }
        } else if (updateData.planId === null) {
            // Plan cleared
            updateData.planName = '';
            updateData.planDurationDays = null;
            updateData.planPrice = 0;
            updateData.planDiscount = 0;
            updateData.finalPrice = 0;
            updateData.planStartDate = null;
            updateData.planExpiryDate = null;
        }

        const updatedCompany = await Company.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        // Handle Coupon Usage record independently
        if (updateData.couponCode && updateData.couponCode !== 'null' && updateData.couponCode !== company.couponCode) {
            try {
                const coupon = await Coupon.findOne({ couponCode: updateData.couponCode.toUpperCase() });
                if (coupon) {
                    await CouponUsage.create({
                        couponId: coupon._id,
                        companyId: company._id,
                        planId: updatedCompany.planId,
                        discountAmount: updatedCompany.couponDiscountAmount || 0,
                        finalPrice: updatedCompany.finalPrice || 0
                    });
                }
            } catch (cError) {
                console.error('Coupon usage creation error:', cError);
                // Non-fatal error
            }
        }

        res.status(200).json(updatedCompany);
    } catch (error) {
        console.error('Update Company Detailed Error:', error);
        res.status(500).json({
            message: 'Internal Server Error during company update',
            error: error.message
        });
    }
};

// @desc    Delete company (SUPER_ADMIN only)
// @route   DELETE /api/company/:id
// @access  Private (SUPER_ADMIN)
const deleteCompany = async (req, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Access denied. SUPER_ADMIN only.' });
        }

        const company = await Company.findById(req.params.id);

        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        await company.deleteOne();
        res.status(200).json({ message: 'Company removed' });
    } catch (error) {
        console.error('Delete Company Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get plan status for a company
// @route   GET /api/company/:id/plan-status
// @access  Private
const getPlanStatus = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id).select('planId planName planDurationDays planStartDate planExpiryDate companyName');
        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        const now = new Date();
        const expiry = company.planExpiryDate ? new Date(company.planExpiryDate) : null;

        let isExpired = false;
        let daysRemaining = null;

        if (expiry) {
            const diffMs = expiry - now;
            daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            isExpired = daysRemaining <= 0;
        }

        res.status(200).json({
            companyId: company._id,
            companyName: company.companyName,
            planId: company.planId,
            planName: company.planName,
            planDurationDays: company.planDurationDays,
            planStartDate: company.planStartDate,
            planExpiryDate: company.planExpiryDate,
            isExpired,
            daysRemaining
        });
    } catch (error) {
        console.error('Plan Status Error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getCompanyById,
    getAllCompanies,
    createCompany,
    updateCompany,
    deleteCompany,
    getPlanStatus
};
