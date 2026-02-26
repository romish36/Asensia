const mongoose = require("mongoose");

const outStockSchema = new mongoose.Schema(
    {
        outStockId: {
            type: Number,
            required: true,
            unique: true,
        },

        invoiceId: {
            type: Number,
            required: true,
        },

        invoiceMetaId: {
            type: Number,
            required: true,
        },

        invoiceNo: {
            type: String,
            trim: true,
        },

        outQuantityDate: {
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

        outQuantity: {
            type: String, // kept string because original schema is string
        },

        outPrice: {
            type: String,
        },

        totalAmount: {
            type: String,
        },

        // ---------- Audit ----------
        date: String,
        time: String,
        insertId: Number,
        updateId: Number,
        deleteId: Number,

        // Added for System Compatibility
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
    { timestamps: true }
);

module.exports = mongoose.model("OutStock", outStockSchema);
