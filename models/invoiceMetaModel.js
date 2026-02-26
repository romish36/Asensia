const mongoose = require("mongoose");

const invoiceMetaSchema = new mongoose.Schema(
    {
        invoiceMetaId: {
            type: Number
        },

        invoiceId: {
            type: Number
        },

        invoiceDate: {
            type: String
        },

        sizeId: {
            type: Number
        },

        sizeName: {
            type: String,
            trim: true
        },

        productId: {
            type: Number
        },

        productName: {
            type: String,
            trim: true
        },

        productHsnCode: {
            type: String
        },

        gradeId: {
            type: Number
        },

        productGrade: {
            type: String
        },

        modelNumber: {
            type: String
        },

        colorId: {
            type: Number
        },

        colorName: {
            type: String
        },

        unit: {
            type: String
        },

        quantity: {
            type: String
        },

        rate: {
            type: String
        },

        total: {
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

        // Company Scoping for consistency
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

module.exports = mongoose.model("InvoiceMeta", invoiceMetaSchema);
