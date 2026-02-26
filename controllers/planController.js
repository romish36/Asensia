const Plan = require('../models/planModel');

// Auto-increment helper
const getNextId = async () => {
    const last = await Plan.findOne().sort({ planId: -1 });
    return last && last.planId ? last.planId + 1 : 1;
};

// @desc    Get all plans
// @route   GET /api/plan
// @access  Private
const getAllPlans = async (req, res) => {
    try {
        let query = { isActive: true };
        const { search, page, limit } = req.query;

        if (search) {
            query.$or = [
                { planName: { $regex: search, $options: 'i' } },
                { planDescription: { $regex: search, $options: 'i' } }
            ];
        }

        if (!page && !limit) {
            const plans = await Plan.find(query).sort({ createdAt: -1 });
            return res.status(200).json(plans);
        }

        const currentPage = parseInt(page) || 1;
        const currentLimit = parseInt(limit) || 10;
        const skip = (currentPage - 1) * currentLimit;

        const [plans, total] = await Promise.all([
            Plan.find(query).sort({ createdAt: -1 }).skip(skip).limit(currentLimit),
            Plan.countDocuments(query)
        ]);

        res.status(200).json({
            plans,
            total,
            page: currentPage,
            pages: Math.ceil(total / currentLimit)
        });
    } catch (error) {
        console.error('Get Plans Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get plan by ID
// @route   GET /api/plan/:id
// @access  Private
const getPlanById = async (req, res) => {
    try {
        const plan = await Plan.findById(req.params.id);
        if (!plan) return res.status(404).json({ message: 'Plan not found' });
        res.status(200).json(plan);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create plan (SUPER_ADMIN only)
// @route   POST /api/plan
// @access  Private (SUPER_ADMIN)
const createPlan = async (req, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Access denied. SUPER_ADMIN only.' });
        }

        const { planName, planDurationDays, planDescription, planPrice, planDiscount } = req.body;

        if (!planName || !planDurationDays) {
            return res.status(400).json({ message: 'planName and planDurationDays are required' });
        }

        const price = Number(planPrice) || 0;
        const discount = Number(planDiscount) || 0;
        const finalPrice = price - (price * (discount / 100));

        const nextId = await getNextId();
        const plan = await Plan.create({
            planId: nextId,
            planName,
            planDurationDays: Number(planDurationDays),
            planPrice: price,
            planDiscount: discount,
            finalPrice: finalPrice,
            planDescription: planDescription || '',
            isActive: true
        });

        res.status(201).json(plan);
    } catch (error) {
        console.error('Create Plan Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update plan (SUPER_ADMIN only)
// @route   PUT /api/plan/:id
// @access  Private (SUPER_ADMIN)
const updatePlan = async (req, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Access denied. SUPER_ADMIN only.' });
        }

        const updateData = { ...req.body };
        if (updateData.planPrice !== undefined || updateData.planDiscount !== undefined) {
            const currentPlan = await Plan.findById(req.params.id);
            if (!currentPlan) return res.status(404).json({ message: 'Plan not found' });

            const price = updateData.planPrice !== undefined ? Number(updateData.planPrice) : currentPlan.planPrice;
            const discount = updateData.planDiscount !== undefined ? Number(updateData.planDiscount) : currentPlan.planDiscount;
            updateData.finalPrice = price - (price * (discount / 100));
        }

        const plan = await Plan.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
        if (!plan) return res.status(404).json({ message: 'Plan not found' });

        res.status(200).json(plan);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete plan (SUPER_ADMIN only)
// @route   DELETE /api/plan/:id
// @access  Private (SUPER_ADMIN)
const deletePlan = async (req, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Access denied. SUPER_ADMIN only.' });
        }

        const plan = await Plan.findById(req.params.id);
        if (!plan) return res.status(404).json({ message: 'Plan not found' });

        await plan.deleteOne();
        res.status(200).json({ message: 'Plan deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAllPlans,
    getPlanById,
    createPlan,
    updatePlan,
    deletePlan
};
