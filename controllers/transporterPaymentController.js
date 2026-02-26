const TransporterPayment = require("../models/transporterPaymentModel");
const PurchaseOrder = require("../models/purchaseOrderModel");
const SalesInvoice = require("../models/salesInvoiceModel");
const Transporter = require("../models/transporterModel");

// Helper to get next ID
const getNextPaymentId = async () => {
    const lastDoc = await TransporterPayment.findOne().sort({ transporterPaymentId: -1 });
    return lastDoc && lastDoc.transporterPaymentId ? lastDoc.transporterPaymentId + 1 : 1;
};

// CREATE Payment
const createTransporterPayment = async (req, res) => {
    try {
        const nextId = await getNextPaymentId();

        const newPayment = new TransporterPayment({
            ...req.body,
            transporterPaymentId: nextId,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            insertId: req.user.userId,
            paymentCollector: req.user.userId,
            paymentCollectorName: req.user.name || "System",
            companyId: req.user.companyId
        });

        const savedPayment = await newPayment.save();
        res.status(201).json({ message: "Transporter payment recorded successfully", payment: savedPayment });
    } catch (error) {
        console.error("Create Transporter Payment Error:", error);
        res.status(500).json({ message: "Failed to record payment", error: error.message });
    }
};

// GET Transporter Totals
const getTransporterTotals = async (req, res) => {
    try {
        const { transporterId } = req.params;
        const numId = Number(transporterId);

        // Fetch transporter details
        const transporterDoc = await Transporter.findOne({ transporterId: numId });
        const tName = transporterDoc ? (transporterDoc.transporterTradeName || transporterDoc.transporterName) : null;

        // 1. Calculate Total Freight from Purchase Orders (Debit)
        const purchaseOrders = await PurchaseOrder.find({
            $or: [
                { transporterId: numId },
                { transporterName: tName }
            ]
        });
        const poFreight = purchaseOrders.reduce((sum, po) => sum + (Number(po.freight) || 0), 0);

        // 2. Calculate Total Freight from Sales Invoices (Debit)
        const salesInvoices = await SalesInvoice.find({
            $or: [
                { transporterId: numId },
                { transporterName: tName }
            ]
        });
        // Assuming extrChargesAmount is freight in SalesInvoice
        const siFreight = salesInvoices.reduce((sum, si) => sum + (Number(si.extrChargesAmount) || 0), 0);

        const totalDebit = poFreight + siFreight;

        // 3. Calculate Paid Amount (Credit)
        const payments = await TransporterPayment.find({
            $or: [
                { transporterId: numId },
                { transporterName: tName }
            ]
        });
        const totalCredit = payments.reduce((sum, pay) => sum + (Number(pay.paymentAmount) || 0), 0);

        const balance = totalDebit - totalCredit;

        res.status(200).json({
            totalDebit,
            totalCredit,
            balance,
            invoiceCount: purchaseOrders.length + salesInvoices.length,
            paymentCount: payments.length
        });
    } catch (error) {
        console.error("Get Transporter Totals Error:", error);
        res.status(500).json({ message: "Failed to fetch transporter totals", error: error.message });
    }
};

// GET Transporter Ledger
const getTransporterLedger = async (req, res) => {
    try {
        const { transporterId } = req.params;
        const numId = Number(transporterId);

        const transporterDoc = await Transporter.findOne({ transporterId: numId });
        const tName = transporterDoc ? (transporterDoc.transporterTradeName || transporterDoc.transporterName) : null;

        // Fetch Data
        const purchaseOrders = await PurchaseOrder.find({ $or: [{ transporterId: numId }, { transporterName: tName }] }).lean();
        const salesInvoices = await SalesInvoice.find({ $or: [{ transporterId: numId }, { transporterName: tName }] }).lean();
        const payments = await TransporterPayment.find({ $or: [{ transporterId: numId }, { transporterName: tName }] }).lean();

        // Map to unified format
        const statementEntries = [
            ...purchaseOrders.map(po => ({
                id: po._id,
                date: po.invoiceDate || po.date,
                type: 'Invoice',
                refNo: po.invoiceNo,
                narration: 'Purchase Freight',
                debit: Number(po.freight) || 0,
                credit: 0,
                timestamp: new Date(po.createdAt).getTime()
            })),
            ...salesInvoices.map(si => ({
                id: si._id,
                date: si.invoiceDate || si.date,
                type: 'Invoice',
                refNo: si.invoiceNo,
                narration: 'Sales Freight',
                debit: Number(si.extrChargesAmount) || 0,
                credit: 0,
                timestamp: new Date(si.createdAt).getTime()
            })),
            ...payments.map(pay => ({
                id: pay._id,
                date: pay.paymentDate || pay.date,
                type: 'Payment',
                refNo: `PAY-${pay.transporterPaymentId}`,
                narration: pay.remark || `Payment via ${pay.paymentModeName}`,
                debit: 0,
                credit: Number(pay.paymentAmount) || 0,
                timestamp: new Date(pay.createdAt).getTime()
            }))
        ];

        statementEntries.sort((a, b) => a.timestamp - b.timestamp);

        let runningBalance = 0;
        const ledger = statementEntries.map(entry => {
            runningBalance += (entry.debit - entry.credit);
            return { ...entry, balance: runningBalance };
        });

        res.status(200).json(ledger);
    } catch (error) {
        console.error("Get Transporter Ledger Error:", error);
        res.status(500).json({ message: "Failed to fetch ledger", error: error.message });
    }
};

// GET All Payments (Optionally filtered by transporter)
const getPayments = async (req, res) => {
    try {
        const { transporterId } = req.query;
        const query = {};
        if (req.user.role !== 'SUPER_ADMIN') {
            query.companyId = req.user.companyId;
        }
        if (transporterId) query.transporterId = Number(transporterId);

        const payments = await TransporterPayment.find(query).sort({ createdAt: -1 });
        res.status(200).json(payments);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch payments", error: error.message });
    }
};

// UPDATE Payment
const updateTransporterPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentAmount, paymentDate, paymentTime, paymentModeName, remark } = req.body;

        const updatedPayment = await TransporterPayment.findByIdAndUpdate(
            id,
            {
                paymentAmount,
                paymentDate,
                paymentTime,
                paymentModeName,
                remark
            },
            { new: true }
        );

        if (!updatedPayment) {
            return res.status(404).json({ message: "Payment not found" });
        }

        res.status(200).json({ message: "Payment updated successfully", payment: updatedPayment });
    } catch (error) {
        console.error("Update Payment Error:", error);
        res.status(500).json({ message: "Failed to update payment", error: error.message });
    }
};

// DELETE Payment
const deleteTransporterPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedPayment = await TransporterPayment.findByIdAndDelete(id);

        if (!deletedPayment) {
            return res.status(404).json({ message: "Payment not found" });
        }

        res.status(200).json({ message: "Payment deleted successfully" });
    } catch (error) {
        console.error("Delete Payment Error:", error);
        res.status(500).json({ message: "Failed to delete payment", error: error.message });
    }
};

module.exports = {
    createTransporterPayment,
    getTransporterTotals,
    getTransporterLedger,
    getPayments,
    updateTransporterPayment,
    deleteTransporterPayment
};
