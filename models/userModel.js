const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        userId: Number,

        userName: {
            type: String,
            trim: true
        },

        userMobileNumber: String,

        userEmail: {
            type: String,
            trim: true,
            lowercase: true
        },

        userPassword: {
            type: String,
            required: true
        },

        // 0 = inactive, 1 = active
        userStatus: {
            type: Number,
            default: 1
        },

        // OLD numeric role kept (migration safe)
        userRole: Number,

        // NEW SaaS role system
        role: {
            type: String,
            enum: ["SUPER_ADMIN", "ADMIN", "USER"],
            default: "USER"
        },

        // 🔐 MULTI-TENANT FIELD
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: function () {
                return this.role !== "SUPER_ADMIN";
            }
        },

        userBirthdayDate: String,
        userProfile: String,

        date: String,
        time: String,

        insertId: Number,
        updateId: Number,
        deleteId: Number,

        isActive: {
            type: Boolean,
            default: true
        },
        resetPasswordOTP: String,
        resetPasswordExpires: Date
    },
    { timestamps: true }
);

// Validation: Non-SUPER_ADMIN users must have companyId (except legacy users)
// Validation: Non-SUPER_ADMIN users must have companyId (except legacy users)
userSchema.pre('save', async function () {
    if (this.isNew && this.role !== 'SUPER_ADMIN' && !this.companyId) {
        // Allow save but log warning for migration tracking
        console.warn(`⚠️ User ${this.userEmail} created without companyId - legacy mode`);
    }
});

module.exports = mongoose.model('User', userSchema);
