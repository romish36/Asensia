const mongoose = require("mongoose");

const invoicePaymentTypeSchema = new mongoose.Schema(
    {
        invoicePaymentTypeId: {
            type: Number
        },

        invoicePaymentTypeName: {
            type: String,
            trim: true
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

        // Company Scoping for multi-tenancy consistency
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true,
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("InvoicePaymentType", invoicePaymentTypeSchema);
