const mongoose = require("mongoose");

const salesInvoiceSchema = new mongoose.Schema(
    {
        invoiceId: { type: Number, required: true, unique: true },
        purchaseOrderId: Number,

        // ---------- Company ----------
        invoiceCompanyId: Number,
        invoiceCompanyName: String,
        invoiceCompanyMobileNumber: String,
        invoiceCompanyEmail: String,
        invoiceCompanyGstNumber: String,
        invoiceCompanyPanNumber: String,
        invoiceCompanyAddress: String,
        invoiceCompanyCountry: String,
        invoiceCompanyState: String,
        invoiceCompanyCity: String,
        invoiceCompanyPinCode: String,
        invoiceCompanyStateCode: String,

        // Bank
        invoiceCompanyBankName: String,
        invoiceCompanyBankAccountName: String,
        invoiceCompanyBankAccountNumber: String,
        invoiceCompanyBankIfscCode: String,
        invoiceCompanyBankAddress: String,

        // ---------- Payment ----------
        invoicePaymentTypeId: Number,
        invoicePaymentTypeName: String,

        // ---------- Invoice Type ----------
        invoiceTypeId: Number,
        invoiceTypeName: String,
        invoiceCopyId: Number,
        invoiceCopyName: String,

        // ---------- Customer ----------
        customerId: Number,
        customerName: String,
        customerTradeName: String,
        customerPinCode: String,
        customerAddress: String,
        customerDeliveryAddress: String,
        customerGst: String,
        customerPanNo: String,
        customerPlaceOfSupply: String,
        customerState: String,
        customerStateCode: String,

        // ---------- Sale Type ----------
        saleTypeId: Number,
        saleTypeName: String,
        saleTypeTax1: String,
        saleTypeTax2: String,

        // ---------- Transport ----------
        invoiceNo: String,
        invoiceDate: String,
        vehicleNo: String,

        transporterId: Number,
        transporterName: String,
        transporterTradeName: String,
        transporterMobileNumber: String,
        transporterEmail: String,
        transporterGstNumber: String,

        lrNo: String,

        // ---------- EWay Bill ----------
        eWayBillNo: String,
        ewayBillDate: String,
        validUpto: String,
        createEwayBillTransactionId: String,
        cancelDate: String,
        cancelRsnCode: String,
        cancelRmrk: String,
        cancelEwaybillTransactionId: String,
        eWayBillResponse: String,

        // ---------- Extra ----------
        insurance: String,
        extraChargesAddTax: Number,
        extrChargesAmount: String,
        extraChargesName: String,
        specialNote: String,
        paymentTerms: String,
        termsCondition: String,
        tagLine: String,
        containerNo: String,
        sealNo: String,
        invoiceLock: Number,

        items: [
            {
                category: String,
                product: String,
                hsnCode: String,
                grade: String,
                modelNumber: String,
                color: String,
                sizeName: String,
                sizeId: Number,
                unit: String,
                quantity: Number,
                rate: Number,
                total: Number,
            }
        ],
        totalAmount: Number,
        active: { type: Boolean, default: true },

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

module.exports = mongoose.model("SalesInvoice", salesInvoiceSchema);
