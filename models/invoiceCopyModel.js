const mongoose = require("mongoose");

const invoiceCopySchema = new mongoose.Schema(
    {
        invoiceCopyId: {
            type: Number
        },

        invoiceCopyName: {
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

        // Company Scoping for consistency
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true,
        }
    },
    {
        timestamps: true   // optional (createdAt, updatedAt auto)
    }
);

module.exports = mongoose.model("InvoiceCopy", invoiceCopySchema);
