const mongoose = require("mongoose");

const purchaseOrderPaymentSchema = new mongoose.Schema(
    {
        purchaseOrderPaymentId: {
            type: Number
        },

        buyerId: {
            type: Number
        },

        buyerTradeName: {
            type: String,
            trim: true
        },

        paymentAmount: {
            type: String
        },

        paymentDate: {
            type: String
        },

        paymentTime: {
            type: String
        },

        paymentMode: {
            type: Number
        },

        paymentModeName: {
            type: String
        },

        remark: {
            type: String
        },

        paymentCollector: {
            type: Number
        },

        paymentCollectorName: {
            type: String
        },

        paymentDocument: {
            type: String
        },

        date: {
            type: String
        },

        time: {
            type: String
        },

        insertId: {
            type: Number
        },

        updateId: {
            type: Number
        },

        deleteId: {
            type: Number
        },

        // Company Scoping
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("PurchaseOrderPayment", purchaseOrderPaymentSchema);
