const mongoose = require("mongoose");

const paymentModeSchema = new mongoose.Schema(
    {
        paymentModeId: {
            type: Number,
            required: true,
            unique: true,
        },

        paymentModeName: {
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

module.exports = mongoose.model("PaymentMode", paymentModeSchema);
