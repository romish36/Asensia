const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
    {
        categoryId: {
            type: Number,
            required: true,
            unique: true,
        },
        categoryName: {
            type: String,
            required: true,
            trim: true,
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
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Category", categorySchema);
