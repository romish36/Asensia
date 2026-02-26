const mongoose = require("mongoose");

const transporterPaymentSchema = new mongoose.Schema(
    {
        transporterPaymentId: {
            type: Number,
            required: true,
            unique: true
        },

        transporterId: {
            type: Number
        },

        transporterName: {
            type: String,
            trim: true
        },

        paymentAmount: {
            type: Number
        },

        paymentDate: {
            type: String
        },

        paymentTime: {
            type: String
        },

        paymentModeName: {
            type: String
        },

        remark: {
            type: String
        },

        paymentCollector: {
            type: Number
        },

        paymentCollectorName: {
            type: String
        },

        paymentDocument: {
            type: String
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

module.exports = mongoose.model("TransporterPayment", transporterPaymentSchema);
