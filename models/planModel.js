const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
    {
        planId: Number,
        planName: {
            type: String,
            required: true,
            trim: true
        },
        planDurationDays: {
            type: Number,
            required: true,
            min: 1
        },
        planPrice: {
            type: Number,
            default: 0
        },
        planDiscount: {
            type: Number,
            default: 0 // Percentage
        },
        finalPrice: {
            type: Number,
            default: 0
        },
        planDescription: {
            type: String,
            trim: true
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Plan', planSchema);
