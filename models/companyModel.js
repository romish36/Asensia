const mongoose = require("mongoose");
const Plan = require("./planModel");

const companySchema = new mongoose.Schema(
    {
        companyId: Number,
        companyName: { type: String, trim: true },
        companyPersonName: { type: String, trim: true },
        companyEmail: { type: String, trim: true, lowercase: true },

        companyMobileNumber_1: String,
        companyMobileNumber_2: String,
        companyWebsiteUrl: String,

        companyGstNumber: String,
        companyPanCardNumber: String,
        companyAadharCardNumber: String,

        countryId: Number,
        companyCountry: String,
        stateId: Number,
        companyState: String,
        cityId: Number,
        companyCity: String,

        companyStateCode: String,
        companyPinCode: String,
        companyAddress: String,
        companyMapUrl: String,

        // Bank Details
        companyBankName: String,
        companyBankAccountName: String,
        companyBankAccountNumber: String,
        companySwiftCode: String,
        companyIbanNo: String,
        companyBankIfscCode: String,
        companyBankAddress: String,

        // Images & Documents
        companyLogoImage: String,
        companyLetterHeadHeaderImage: String,
        companyLetterHeadFooterImage: String,
        companyDigitalSignature: String,
        companyPanCardFrontImage: String,
        companyPanCardBackImage: String,
        companyAadharCardFrontImage: String,
        companyAadharCardBackImage: String,

        companyOtherDocuments_1: String,
        companyOtherDocuments_2: String,
        companyOtherDocuments_3: String,
        companyOtherDocuments_4: String,
        companyOtherDocuments_5: String,

        companyBackground: Number,

        eWayBillUsername: String,
        eWayBillPassword: String,

        date: String,
        time: String,

        insertId: Number,
        updateId: Number,
        deleteId: Number,

        // Plan / Subscription
        planId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Plan',
            default: null
        },
        planName: { type: String, default: '' },
        planDurationDays: { type: Number, default: null },
        planPrice: { type: Number, default: 0 },
        planDiscount: { type: Number, default: 0 }, // Discount from plan itself
        couponCode: { type: String, default: null },
        couponDiscountAmount: { type: Number, default: 0 },
        finalPrice: { type: Number, default: 0 }, // Price after plan discount and coupon
        planStartDate: { type: Date, default: null },
        planExpiryDate: { type: Date, default: null },

        // SaaS control field (important for future)
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Company", companySchema);
