const mongoose = require("mongoose");

const purchaseOrderSchema = new mongoose.Schema(
    {
        purchaseOrderId: { type: Number, required: true, unique: true },
        customerId: Number,

        // ---------- Buyer ----------
        buyerId: Number,
        buyerTradeName: String,
        buyerMobileNumber: String,
        buyerEmail: String,
        buyerPanCardNumber: String,
        buyerGstNumber: String,
        buyerCinNumber: String,
        buyerCountry: String,
        buyerState: String,
        buyerCity: String,
        buyerPinCode: String,
        buyerAddress: String,
        buyerBankName: String,
        buyerBankAccountName: String,
        buyerAccountNo: String,
        buyerIfscCode: String,

        // ---------- Company (Seller Details for Purchase) ----------
        purchaseCompanyId: Number, // Numeric ID for company in this context
        companyName: String,
        companyMobileNumber: String,
        companyEmail: String,
        companyGstNumber: String,
        companyPanCardNumber: String,
        companyCountry: String,
        companyState: String,
        companyCity: String,
        companyPinCode: String,
        companyAddress: String,

        // ---------- Invoice ----------
        invoiceNo: String,
        invoiceDate: String,
        prerartionDate: String,
        prerartionTime: String,
        removalDate: String,
        removalTime: String,

        // ---------- Transport ----------
        transporterId: Number,
        transporterName: String,
        transporterMobileNumber: String,
        transporterEmail: String,
        transporterGstNumber: String,
        vehicleNo: String,
        lrNo: String,
        eWayBillNo: String,

        // ---------- Charges ----------
        freight: String,
        insurance: String,

        // ---------- Tax ----------
        saleTypeName: String,
        saleTypeTax1: String,
        saleTypeTax2: String,

        // ---------- Items ----------
        items: [
            {
                category: String,
                product: String,
                hsnCode: String,
                grade: String,
                modelNumber: String,
                productFinishGlaze: String,
                productSalePrice: String,
                unit: String,
                color: String,
                quantity: Number,
                rate: Number,
                total: Number,
            }
        ],
        totalAmount: Number,
        active: { type: Boolean, default: true },

        // ---------- Notes ----------
        remarks: String,
        termsCondtion: String,
        purchaseOrderLock: Number,

        // ---------- Audit ----------
        date: String,
        time: String,
        insertId: Number,
        updateId: Number,
        deleteId: Number,

        // ---------- Multi-tenancy ----------
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
