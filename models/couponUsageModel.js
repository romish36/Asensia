const mongoose = require('mongoose');

const couponUsageSchema = new mongoose.Schema(
    {
        couponId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coupon',
            required: true
        },
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
            required: true
        },
        usedAt: {
            type: Date,
            default: Date.now
        },
        planId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Plan'
        },
        discountAmount: Number,
        finalPrice: Number
    },
    { timestamps: true }
);

// Compound index to ensure a company can only use a specific coupon once
couponUsageSchema.index({ couponId: 1, companyId: 1 }, { unique: true });

module.exports = mongoose.model('CouponUsage', couponUsageSchema);
