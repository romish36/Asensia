const mongoose = require("mongoose");

const sellerSchema = new mongoose.Schema(
    {
        sellerId: {
            type: Number,
            required: true,
            unique: true,
        },

        sellerName: {
            type: String,
            trim: true,
        },

        sellerTradeName: String,
        sellerPrefix: String,
        sellerEmail: String,
        sellerMobileNumber: String,

        // ---------- Tax ----------
        sellerGstNumber: String,
        sellerPanCardNumber: String,
        sellerCinNumber: String,

        // ---------- Address ----------
        sellerCountry: String,
        sellerState: String,
        sellerCity: String,
        sellerCountryId: Number,
        sellerStateId: Number,
        sellerCityId: Number,
        sellerStateCode: String,
        sellerPinCode: String,
        sellerAddress: String,

        // ---------- Type ----------
        sellerTypeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CustomerType" // Or a generic Type model if available, but following Customer pattern
        },
        saleTypeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SaleType"
        },

        // ---------- Bank ----------
        sellerBankName: String,
        sellerBankAccountName: String,
        sellerAccountNo: String,
        sellerIfscCode: String,
        sellerBankAddress: String,

        // ---------- Audit ----------
        date: String,
        time: String,
        insertId: Number,
        updateId: Number,
        deleteId: Number,

        // ---------- Status ----------
        active: {
            type: Boolean,
            default: true
        },

        // ---------- Multi-tenancy ----------
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Seller", sellerSchema);
