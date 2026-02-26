const InvoicePayment = require("../models/invoicePaymentModel");
const SalesInvoice = require("../models/salesInvoiceModel");
const User = require("../models/userModel");

// Helper to get next ID for InvoicePayment
const getNextPaymentId = async () => {
    const lastDoc = await InvoicePayment.findOne().sort({ invoicePaymentId: -1 });
    return lastDoc && lastDoc.invoicePaymentId ? lastDoc.invoicePaymentId + 1 : 1;
};

// CREATE Payment
const createInvoicePayment = async (req, res) => {
    try {
        const nextId = await getNextPaymentId();

        const newPayment = new InvoicePayment({
            ...req.body,
            invoicePaymentId: nextId,
            companyId: req.user.role === 'SUPER_ADMIN' ? req.body.companyId : req.user.companyId,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            insertId: req.user.userId,
            paymentCollector: req.user.userId,
            paymentCollectorName: req.user.name || "System"
        });

        const savedPayment = await newPayment.save();
        res.status(201).json({ message: "Payment recorded successfully", payment: savedPayment });
    } catch (error) {
        console.error("Create Payment Error:", error);
        res.status(500).json({ message: "Failed to record payment", error: error.message });
    }
};

// GET Customer Totals (Debit, Credit, Balance)
const getCustomerTotals = async (req, res) => {
    try {
        const { customerId } = req.params;
        const numId = Number(customerId);

        // 1. Calculate Total Debit (Total sum of all sales invoices for this customer)
        const invoices = await SalesInvoice.find({ customerId: numId, companyId: req.user.companyId });
        const totalDebit = invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) * 1.18 || 0), 0);

        // 2. Calculate Total Credit (Total sum of all payments for this customer)
        const payments = await InvoicePayment.find({ customerId: numId, companyId: req.user.companyId });
        const totalCredit = payments.reduce((sum, pay) => sum + (Number(pay.paymentAmount) || 0), 0);

        const balance = totalDebit - totalCredit;

        res.status(200).json({
            totalDebit,
            totalCredit,
            balance,
            invoiceCount: invoices.length,
            paymentCount: payments.length
        });
    } catch (error) {
        console.error("Get Totals Error:", error);
        res.status(500).json({ message: "Failed to fetch customer totals", error: error.message });
    }
};

// GET Customer Ledger (Statement)
const getCustomerLedger = async (req, res) => {
    try {
        const { customerId } = req.params;
        const numId = Number(customerId);

        // Fetch Invoices
        const invoices = await SalesInvoice.find({ customerId: numId, companyId: req.user.companyId }).lean();
        // Fetch Payments
        const payments = await InvoicePayment.find({ customerId: numId, companyId: req.user.companyId }).lean();

        // Map them to a unified statement format
        const statementEntries = [
            ...invoices.map(inv => ({
                id: inv._id,
                date: inv.invoiceDate || inv.date,
                type: 'Invoice',
                refNo: inv.invoiceNo,
                narration: 'Sales Invoice',
                debit: (Number(inv.totalAmount) * 1.18) || 0,
                credit: 0,
                timestamp: new Date(inv.createdAt).getTime()
            })),
            ...payments.map(pay => ({
                id: pay._id,
                date: pay.paymentDate || pay.date,
                type: 'Payment',
                refNo: `PAY-${pay.invoicePaymentId}`,
                narration: pay.remark || `Payment via ${pay.paymentModeName}`,
                debit: 0,
                credit: Number(pay.paymentAmount) || 0,
                timestamp: new Date(pay.createdAt).getTime()
            }))
        ];

        // Sort by timestamp or date
        statementEntries.sort((a, b) => a.timestamp - b.timestamp);

        // Calculate Running Balance
        let runningBalance = 0;
        const ledger = statementEntries.map(entry => {
            runningBalance += (entry.debit - entry.credit);
            return { ...entry, balance: runningBalance };
        });

        res.status(200).json(ledger);
    } catch (error) {
        console.error("Get Ledger Error:", error);
        res.status(500).json({ message: "Failed to fetch ledger", error: error.message });
    }
};

// GET All Payments (Optionally filtered by customer)
const getPayments = async (req, res) => {
    try {
        const { customerId } = req.query;
        const query = {};
        if (req.user.role !== 'SUPER_ADMIN') {
            query.companyId = req.user.companyId;
        }
        if (customerId) query.customerId = Number(customerId);

        const payments = await InvoicePayment.find(query).sort({ createdAt: -1 });
        res.status(200).json(payments);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch payments", error: error.message });
    }
};

// UPDATE Payment
const updateInvoicePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentAmount, paymentDate, paymentTime, paymentModeName, remark } = req.body;

        const updatedPayment = await InvoicePayment.findByIdAndUpdate(
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
const deleteInvoicePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedPayment = await InvoicePayment.findByIdAndDelete(id);

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
    createInvoicePayment,
    getCustomerTotals,
    getCustomerLedger,
    getPayments,
    updateInvoicePayment,
    deleteInvoicePayment
};
