const Coupon = require('../models/couponModel');
const CouponUsage = require('../models/couponUsageModel');

// @desc    Get all coupons
// @route   GET /api/coupon
// @access  Private
const getAllCoupons = async (req, res) => {
    try {
        let query = {};
        const { search, page, limit } = req.query;

        if (search) {
            query.$or = [
                { couponCode: { $regex: search, $options: 'i' } },
                { couponName: { $regex: search, $options: 'i' } }
            ];
        }

        if (!page && !limit) {
            const coupons = await Coupon.find(query).sort({ createdAt: -1 });
            return res.status(200).json(coupons);
        }

        const currentPage = parseInt(page) || 1;
        const currentLimit = parseInt(limit) || 10;
        const skip = (currentPage - 1) * currentLimit;

        const [coupons, total] = await Promise.all([
            Coupon.find(query).sort({ createdAt: -1 }).skip(skip).limit(currentLimit),
            Coupon.countDocuments(query)
        ]);

        res.status(200).json({
            coupons,
            total,
            page: currentPage,
            pages: Math.ceil(total / currentLimit)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get coupon by ID
// @route   GET /api/coupon/:id
// @access  Private
const getCouponById = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
        res.status(200).json(coupon);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create coupon
// @route   POST /api/coupon
// @access  Private (SUPER_ADMIN)
const createCoupon = async (req, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Access denied. SUPER_ADMIN only.' });
        }

        const { couponCode, couponName, discountType, discountValue, validFrom, validTo, applicablePlans, description } = req.body;

        const lastCoupon = await Coupon.findOne().sort({ couponId: -1 });
        const nextId = lastCoupon && lastCoupon.couponId ? lastCoupon.couponId + 1 : 1;

        const coupon = await Coupon.create({
            couponId: nextId,
            couponCode,
            couponName,
            discountType,
            discountValue,
            validFrom,
            validTo,
            applicablePlans: applicablePlans || [],
            description,
            isActive: true
        });

        res.status(201).json(coupon);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Coupon code already exists' });
        }
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update coupon
// @route   PUT /api/coupon/:id
// @access  Private (SUPER_ADMIN)
const updateCoupon = async (req, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Access denied. SUPER_ADMIN only.' });
        }

        const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

        res.status(200).json(coupon);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete coupon
// @route   DELETE /api/coupon/:id
// @access  Private (SUPER_ADMIN)
const deleteCoupon = async (req, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Access denied. SUPER_ADMIN only.' });
        }

        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

        await coupon.deleteOne();
        res.status(200).json({ message: 'Coupon deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Validate coupon
// @route   POST /api/coupon/validate
// @access  Private
const validateCoupon = async (req, res) => {
    try {
        const { couponCode, planId, companyId } = req.body;
        const now = new Date();

        const coupon = await Coupon.findOne({ couponCode: couponCode.toUpperCase(), isActive: true });

        if (!coupon) {
            return res.status(404).json({ valid: false, message: 'Invalid coupon code' });
        }

        if (now < new Date(coupon.validFrom) || now > new Date(coupon.validTo)) {
            return res.status(400).json({ valid: false, message: 'Coupon has expired' });
        }

        // Check if company has already used this coupon
        if (companyId) {
            const usage = await CouponUsage.findOne({ couponId: coupon._id, companyId: companyId });
            if (usage) {
                return res.status(400).json({ valid: false, message: 'You have already used this coupon' });
            }
        }

        // Check if applicable to plan
        if (planId && coupon.applicablePlans.length > 0) {
            if (!coupon.applicablePlans.some(p => p.toString() === planId)) {
                return res.status(400).json({ valid: false, message: 'This coupon is not applicable to the selected plan' });
            }
        }

        res.status(200).json({
            valid: true,
            message: 'Coupon applied successfully',
            coupon: {
                _id: coupon._id,
                couponCode: coupon.couponCode,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAllCoupons,
    getCouponById,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    validateCoupon
};
