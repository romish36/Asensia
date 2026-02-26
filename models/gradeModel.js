const mongoose = require("mongoose");

const gradeSchema = new mongoose.Schema(
    {
        gradeId: {
            type: Number,
            required: true,
            unique: true,
        },

        gradeName: {
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

module.exports = mongoose.model("Grade", gradeSchema);
