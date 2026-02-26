const mongoose = require("mongoose");

const inStockSchema = new mongoose.Schema(
    {
        inStockId: {
            type: Number,
            required: true,
            unique: true,
        },

        purchaseOrderId: {
            type: Number,
            required: true,
        },

        purchaseOrderMetaId: {
            type: Number,
            required: true,
        },

        invoiceNo: {
            type: String,
            trim: true,
        },

        inQuantityDate: {
            type: String,
        },

        productId: {
            type: Number,
            required: true,
        },

        productName: {
            type: String,
            trim: true,
        },

        inQuantity: {
            type: String, // kept string because schema defined string
        },

        inPrice: {
            type: String,
        },

        totalAmount: {
            type: String,
        },

        date: {
            type: String,
        },

        time: {
            type: String,
        },

        insertId: {
            type: Number,
        },

        updateId: {
            type: Number,
        },

        deleteId: {
            type: Number,
        },

        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("InStock", inStockSchema);
