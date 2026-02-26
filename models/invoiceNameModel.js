const mongoose = require("mongoose");

const invoiceNameSchema = new mongoose.Schema(
    {
        invoiceNameId: {
            type: Number,
            required: true,
            unique: true,
        },

        invoiceShortName: {
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

        // Company Scoping for consistency
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("InvoiceName", invoiceNameSchema);
