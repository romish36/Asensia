const mongoose = require("mongoose");

const saleTypeSchema = new mongoose.Schema(
    {
        saleTypeId: {
            type: Number,
            required: true,
            unique: true,
        },

        saleTypeName: {
            type: String,
            required: true,
            trim: true,
        },

        saleTypeTax1: {
            type: String,
        },

        saleTypeTax2: {
            type: String,
        },

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

module.exports = mongoose.model("SaleType", saleTypeSchema);
