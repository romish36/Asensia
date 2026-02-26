const mongoose = require("mongoose");

const invoiceTypeSchema = new mongoose.Schema(
    {
        invoiceTypeId: {
            type: Number
        },

        invoiceTypeName: {
            type: String,
            trim: true
        },

        date: {
            type: String
        },

        time: {
            type: String
        },

        insertId: {
            type: Number
        },

        updateId: {
            type: Number
        },

        deleteId: {
            type: Number
        },

        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("InvoiceType", invoiceTypeSchema);
