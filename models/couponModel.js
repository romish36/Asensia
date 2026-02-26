const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
    {
        couponId: Number,
        couponCode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true
        },
        couponName: {
            type: String,
            required: true,
            trim: true
        },
        discountType: {
            type: String,
            enum: ['percentage', 'flat'],
            required: true,
            default: 'percentage'
        },
        discountValue: {
            type: Number,
            required: true,
            min: 0
        },
        validFrom: {
            type: Date,
            required: true
        },
        validTo: {
            type: Date,
            required: true
        },
        applicablePlans: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Plan'
        }], // Empty array means all plans
        isActive: {
            type: Boolean,
            default: true
        },
        description: {
            type: String,
            trim: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);
