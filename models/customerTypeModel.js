const mongoose = require("mongoose");

const customerTypeSchema = new mongoose.Schema(
    {
        customerTypeId: {
            type: Number,
            required: true,
            unique: true,
        },

        customerTypeName: {
            type: String,
            required: true,
            trim: true,
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

module.exports = mongoose.model("CustomerType", customerTypeSchema);
