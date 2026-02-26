const mongoose = require("mongoose");

const purchaseOrderMetaSchema = new mongoose.Schema(
    {
        purchaseOrderMetaId: {
            type: Number
        },

        purchaseOrderId: {
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

        unit: {
            type: String
        },

        colorId: {
            type: Number
        },

        colorName: {
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
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("PurchaseOrderMeta", purchaseOrderMetaSchema);
