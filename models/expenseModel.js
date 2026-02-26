const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        purpose: {
            type: String,
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        date: {
            type: String,
            required: true,
        },
        paymentMode: {
            type: String,
            required: true,
        },
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true,
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);
