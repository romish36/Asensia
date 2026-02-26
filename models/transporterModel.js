const mongoose = require("mongoose");

const transporterSchema = new mongoose.Schema(
    {
        transporterId: {
            type: Number,
            required: true,
            unique: true,
        },

        transporterName: {
            type: String,
            trim: true,
        },

        transporterTradeName: String,
        transporterReferenceName: String,
        transporterMobileNumber: String,
        transporterEmail: String,

        transporterCountry: String,
        transporterState: String,
        transporterCity: String,

        transporterCountryId: Number,
        transporterStateId: Number,
        transporterCityId: Number,

        transporterPinCode: String,
        transporterStateCode: String,
        transporterAddress: String,

        transporterGst: String,
        transporterPanNo: String,

        transporterTypeId: Number,
        transporterType: String,
        saleTypeId: Number,

        // ---------- Audit ----------
        date: String,
        time: String,
        insertId: Number,
        updateId: Number,
        deleteId: Number,

        // Company Scoping (Matched with other models for consistency)
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Transporter", transporterSchema);
