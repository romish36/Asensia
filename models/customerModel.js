const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
    {
        customerId: {
            type: Number,
            required: true,
            unique: true,
        },

        customerName: {
            type: String,
            trim: true,
        },

        customerTradeName: String,
        customerReferenceName: String,
        customerMobileNumber: String,
        customerEmail: String,

        // ---------- Address ----------
        customerCountry: String,
        customerState: String,
        customerCity: String,
        customerCountryId: Number,
        customerStateId: Number,
        customerCityId: Number,
        customerPinCode: String,
        customerStateCode: String,
        customerAddress: String,

        // ---------- Tax ----------
        customerGst: String,
        customerPanNo: String,

        // ---------- Type ----------
        customerTypeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CustomerType"
        },
        saleTypeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SaleType"
        },
        customerSaleType: Number,
        customerSaleTypeName: String,

        // ---------- Audit ----------
        date: String,
        time: String,
        insertId: Number,
        updateId: Number,
        deleteId: Number,

        // Company Scoping for multi-tenancy consistency
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);
