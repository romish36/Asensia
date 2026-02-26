const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        productId: {
            type: Number,
            required: true,
            unique: true,
        },

        sizeId: {
            type: Number,
            required: false,
        },

        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },

        sizeName: {
            type: String,
            required: false,
            trim: true,
        },

        productName: {
            type: String,
            required: true,
            trim: true,
        },

        productHsnCode: {
            type: String,
            trim: true,
        },

        productGrade: {
            type: String,
            trim: true,
        },

        productModelNumber: {
            type: String,
            trim: true,
        },

        productDesignName: {
            type: String,
            trim: true,
        },

        productFinshGlaze: {
            type: String,
            trim: true,
        },

        productSalePrice: {
            type: String,   // keep string because schema defined string
        },

        productBundle: {
            type: String,
            trim: true,
        },

        productStock: {
            type: Number,
            default: 0,
        },

        productImages: {
            type: String,
        },

        stockType: {
            type: Number,
            default: 0,
        },

        productType: {
            type: Number,
            default: 0,
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
        timestamps: true, // adds createdAt & updatedAt automatically
    }
);

module.exports = mongoose.model("Product", productSchema);
