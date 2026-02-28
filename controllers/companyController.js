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

        // Handle File Uploads
        if (req.files) {
            const companyFolderName = companyData.companyName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            Object.keys(req.files).forEach(key => {
                const file = req.files[key][0];
                companyData[key] = `uploads/companies/${companyFolderName}/${file.filename}`;
            });
            console.log("Uploaded file info:", req.file);
            console.log("Uploaded file path:", req.file.path);
            console.log("Absolute uploads path:", require("path").resolve("uploads"));
        }

        if (!companyData.companyName) {
            return res.status(400).json({ message: 'Company Name is required' });
        }

        // Check if company email already exists (using new schema field)
        // If companyEmail is provided
        if (companyData.companyEmail) {
            const existingCompany = await Company.findOne({ companyEmail: companyData.companyEmail });
            if (existingCompany) {
                return res.status(400).json({ message: 'Company with this email already exists' });
            }
        }

        // Generate next companyId
        const nextId = await getNextId();
        companyData.companyId = nextId;

        // Sanitize numeric fields to avoid CastError for empty strings
        if (!companyData.countryId) companyData.countryId = null;
        if (!companyData.stateId) companyData.stateId = null;
        if (!companyData.cityId) companyData.cityId = null;
        if (companyData.companyBackground === '') companyData.companyBackground = 1;

        // Handle Plan: Priority to provided start date, else auto-calculate
        if (companyData.planId) {
            const plan = await Plan.findById(companyData.planId);
            if (plan) {
                const startDate = companyData.planStartDate ? new Date(companyData.planStartDate) : new Date();

                // Use provided expiry date if valid, else calculate
                let expiryDate;
                if (companyData.planExpiryDate) {
                    expiryDate = new Date(companyData.planExpiryDate);
                } else {
                    expiryDate = new Date(startDate);
                    expiryDate.setDate(expiryDate.getDate() + plan.planDurationDays);
                }

                companyData.planName = plan.planName;
                companyData.planDurationDays = plan.planDurationDays;
                companyData.planPrice = plan.planPrice || 0;
                companyData.planDiscount = plan.planDiscount || 0;

                // Calculate base price after plan discount
                let calculatedPrice = (plan.planPrice || 0) * (1 - (plan.planDiscount || 0) / 100);
                let couponDiscount = 0;

                // Handle Coupon Application
                if (companyData.couponCode) {
                    const now = new Date();
                    const coupon = await Coupon.findOne({ couponCode: companyData.couponCode.toUpperCase(), isActive: true });

                    if (!coupon) {
                        return res.status(400).json({ message: 'Invalid coupon code' });
                    }
                    if (now < new Date(coupon.validFrom) || now > new Date(coupon.validTo)) {
                        return res.status(400).json({ message: 'Coupon has expired' });
                    }
                    if (coupon.applicablePlans.length > 0 && !coupon.applicablePlans.some(p => p.toString() === plan._id.toString())) {
                        return res.status(400).json({ message: 'Coupon not applicable to this plan' });
                    }

                    if (coupon.discountType === 'percentage') {
                        couponDiscount = calculatedPrice * (coupon.discountValue / 100);
                    } else {
                        couponDiscount = coupon.discountValue;
                    }

                    companyData.couponDiscountAmount = couponDiscount;
                    calculatedPrice -= couponDiscount;
                } else {
                    companyData.couponDiscountAmount = 0;
                }

                companyData.finalPrice = Math.max(0, calculatedPrice);
                companyData.planStartDate = startDate;
                companyData.planExpiryDate = expiryDate;

                // We will create the CouponUsage record AFTER company creation to get company._id
            }
        } else {
            // Clear plan fields if no plan selected
            companyData.planId = null;
            companyData.planName = '';
            companyData.planDurationDays = null;
            companyData.planPrice = 0;
            companyData.planDiscount = 0;
            companyData.finalPrice = 0;
            companyData.planStartDate = null;
            companyData.planExpiryDate = null;
        }

        // Set isActive default
        if (companyData.isActive === undefined) companyData.isActive = true;

        const company = await Company.create(companyData);

        // If coupon was used, record it
        if (companyData.couponCode) {
            const coupon = await Coupon.findOne({ couponCode: companyData.couponCode.toUpperCase() });
            if (coupon) {
                await CouponUsage.create({
                    couponId: coupon._id,
                    companyId: company._id,
                    planId: company.planId,
                    discountAmount: companyData.couponDiscountAmount,
                    finalPrice: company.finalPrice
                });
            }
        }

        res.status(201).json(company);
    } catch (error) {
        console.error('Create Company Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update company
// @route   PUT /api/company/:id
// @access  Private (SUPER_ADMIN or company ADMIN)
const updateCompany = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);

        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        // Check permissions: SUPER_ADMIN can update any company, ADMIN can only update their own
        if (req.user.role !== 'SUPER_ADMIN' && req.user.companyId?.toString() !== req.params.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const updateData = { ...req.body };

        // Handle File Uploads
        if (req.files) {
            const companyName = updateData.companyName || company.companyName;
            const companyFolderName = companyName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            Object.keys(req.files).forEach(key => {
                const file = req.files[key][0];
                updateData[key] = `uploads/companies/${companyFolderName}/${file.filename}`;
            });
            console.log("Uploaded file info:", req.file);
            console.log("Uploaded file path:", req.file.path);
            console.log("Absolute uploads path:", require("path").resolve("uploads"));
        }

        // Handle Plan update
        if (updateData.planId) {
            const plan = await Plan.findById(updateData.planId);
            if (plan) {
                let startDate;
                if (updateData.planStartDate) {
                    startDate = new Date(updateData.planStartDate);
                } else {
                    // Re-calculate from today if plan changed, else keep existing start date
                    const existingPlanId = company.planId ? company.planId.toString() : null;
                    const newPlanId = updateData.planId.toString();
                    if (existingPlanId !== newPlanId) {
                        startDate = new Date();
                    } else {
                        startDate = company.planStartDate ? new Date(company.planStartDate) : new Date();
                    }
                }

                let expiryDate;
                if (updateData.planExpiryDate) {
                    expiryDate = new Date(updateData.planExpiryDate);
                } else {
                    expiryDate = new Date(startDate);
                    expiryDate.setDate(expiryDate.getDate() + plan.planDurationDays);
                }

                updateData.planName = plan.planName;
                updateData.planDurationDays = plan.planDurationDays;
                updateData.planPrice = plan.planPrice || 0;
                updateData.planDiscount = plan.planDiscount || 0;

                // Calculate base price after plan discount
                let calculatedPrice = (plan.planPrice || 0) * (1 - (plan.planDiscount || 0) / 100);
                let couponDiscount = 0;

                // Handle Coupon Application
                if (updateData.couponCode && updateData.couponCode !== company.couponCode) {
                    const now = new Date();
                    const coupon = await Coupon.findOne({ couponCode: updateData.couponCode.toUpperCase(), isActive: true });

                    if (!coupon) {
                        return res.status(400).json({ message: 'Invalid coupon code' });
                    }
                    if (now < new Date(coupon.validFrom) || now > new Date(coupon.validTo)) {
                        return res.status(400).json({ message: 'Coupon has expired' });
                    }
                    if (coupon.applicablePlans.length > 0 && !coupon.applicablePlans.some(p => p.toString() === plan._id.toString())) {
                        return res.status(400).json({ message: 'Coupon not applicable to this plan' });
                    }

                    // Check if already used
                    const usage = await CouponUsage.findOne({ couponId: coupon._id, companyId: company._id });
                    if (usage) {
                        return res.status(400).json({ message: 'You have already used this coupon' });
                    }

                    if (coupon.discountType === 'percentage') {
                        couponDiscount = calculatedPrice * (coupon.discountValue / 100);
                    } else {
                        couponDiscount = coupon.discountValue;
                    }

                    updateData.couponDiscountAmount = couponDiscount;
                    calculatedPrice -= couponDiscount;
                } else if (updateData.couponCode === company.couponCode) {
                    // Keep existing coupon discount if plan hasn't changed price significantly? 
                    // Usually coupons are one-time. If it's the SAME coupon, we assume it's already recorded.
                    // But if plan changed, we should re-calculate.
                    couponDiscount = company.couponDiscountAmount || 0;
                    calculatedPrice -= couponDiscount;
                } else {
                    updateData.couponDiscountAmount = 0;
                }

                updateData.finalPrice = Math.max(0, calculatedPrice);
                updateData.planStartDate = startDate;
                updateData.planExpiryDate = expiryDate;
            }
        } else if (updateData.planId === '' || updateData.planId === null) {
            // Plan cleared
            updateData.planId = null;
            updateData.planName = '';
            updateData.planDurationDays = null;
            updateData.planPrice = 0;
            updateData.planDiscount = 0;
            updateData.finalPrice = 0;
            updateData.planStartDate = null;
            updateData.planExpiryDate = null;
        }

        const updatedCompany = await Company.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        // If a NEW coupon was used, record it
        if (updateData.couponCode && updateData.couponCode !== company.couponCode) {
            const coupon = await Coupon.findOne({ couponCode: updateData.couponCode.toUpperCase() });
            if (coupon) {
                await CouponUsage.create({
                    couponId: coupon._id,
                    companyId: company._id,
                    planId: updatedCompany.planId,
                    discountAmount: updatedCompany.couponDiscountAmount,
                    finalPrice: updatedCompany.finalPrice
                });
            }
        }

        res.status(200).json(updatedCompany);
    } catch (error) {
        console.error('Update Company Error:', error);
        res.status(500).json({ message: error.message });
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
