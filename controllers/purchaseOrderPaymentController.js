const PurchaseOrderPayment = require("../models/purchaseOrderPaymentModel");
const PurchaseOrder = require("../models/purchaseOrderModel");
const Seller = require("../models/sellerModel");

// Helper to get next ID
const getNextPaymentId = async () => {
    const lastDoc = await PurchaseOrderPayment.findOne().sort({ purchaseOrderPaymentId: -1 });
    return lastDoc && lastDoc.purchaseOrderPaymentId ? lastDoc.purchaseOrderPaymentId + 1 : 1;
};

// CREATE Payment
const createPurchasePayment = async (req, res) => {
    try {
        const nextId = await getNextPaymentId();

        const newPayment = new PurchaseOrderPayment({
            ...req.body,
            purchaseOrderPaymentId: nextId,
            companyId: req.user.role === 'SUPER_ADMIN' ? req.body.companyId : req.user.companyId,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            insertId: req.user.userId,
            paymentCollector: req.user.userId,
            paymentCollectorName: req.user.name || "System"
        });

        const savedPayment = await newPayment.save();
        res.status(201).json({ message: "Purchase payment recorded successfully", payment: savedPayment });
    } catch (error) {
        console.error("Create Purchase Payment Error:", error);
        res.status(500).json({ message: "Failed to record payment", error: error.message });
    }
};

// GET Seller Totals (Debit, Credit, Balance)
const getSellerTotals = async (req, res) => {
    try {
        const { sellerId } = req.params;
        const numId = Number(sellerId);

        // Fetch seller trade name for fallback search
        const seller = await Seller.findOne({ sellerId: numId });
        const sellerName = seller ? seller.sellerTradeName : null;

        // 1. Calculate Total Invoice Amount (Debit - what we owe them)
        // Match by numeric ID OR trade name (for legacy records)
        const purchaseOrders = await PurchaseOrder.find({
            companyId: req.user.companyId,
            $or: [
                { purchaseCompanyId: numId },
                { companyName: sellerName }
            ]
        });
        const totalInvoiceAmount = purchaseOrders.reduce((sum, po) => sum + (Number(po.totalAmount) * 1.18 || 0), 0);

        // 2. Calculate Paid Amount (Credit - what we have paid them)
        // In PurchaseOrderPayment model, 'buyerId' represents the vendor's numeric ID
        const payments = await PurchaseOrderPayment.find({
            companyId: req.user.companyId,
            $or: [
                { buyerId: numId },
                { buyerTradeName: sellerName }
            ]
        });
        const paidAmount = payments.reduce((sum, pay) => sum + (Number(pay.paymentAmount) || 0), 0);

        const pendingAmount = totalInvoiceAmount - paidAmount;

        res.status(200).json({
            totalInvoiceAmount,
            paidAmount,
            pendingAmount,
            invoiceCount: purchaseOrders.length,
            paymentCount: payments.length
        });
    } catch (error) {
        console.error("Get Seller Totals Error:", error);
        res.status(500).json({ message: "Failed to fetch seller totals", error: error.message });
    }
};

// GET Seller Ledger (Statement)
const getSellerLedger = async (req, res) => {
    try {
        const { sellerId } = req.params;
        const numId = Number(sellerId);

        // Fetch seller trade name for fallback search
        const sellerDoc = await Seller.findOne({ sellerId: numId });
        const sellerName = sellerDoc ? sellerDoc.sellerTradeName : null;

        // Fetch Purchase Invoices
        const purchaseOrders = await PurchaseOrder.find({
            companyId: req.user.companyId,
            $or: [
                { purchaseCompanyId: numId },
                { companyName: sellerName }
            ]
        }).lean();

        // Fetch Payments
        const payments = await PurchaseOrderPayment.find({
            companyId: req.user.companyId,
            $or: [
                { buyerId: numId },
                { buyerTradeName: sellerName }
            ]
        }).lean();

        // Map to unified statement format
        const statementEntries = [
            ...purchaseOrders.map(po => ({
                id: po._id,
                date: po.invoiceDate || po.date,
                type: 'Invoice',
                refNo: po.invoiceNo,
                narration: 'Purchase Invoice',
                debit: (Number(po.totalAmount) * 1.18) || 0,
                credit: 0,
                timestamp: new Date(po.createdAt).getTime()
            })),
            ...payments.map(pay => ({
                id: pay._id,
                date: pay.paymentDate || pay.date,
                type: 'Payment',
                refNo: `PAY-${pay.purchaseOrderPaymentId}`,
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
        console.error("Get Seller Ledger Error:", error);
        res.status(500).json({ message: "Failed to fetch ledger", error: error.message });
    }
};

// GET All Payments
const getPayments = async (req, res) => {
    try {
        const { buyerId } = req.query;
        const query = {};
        if (req.user.role !== 'SUPER_ADMIN') {
            query.companyId = req.user.companyId;
        }

        if (buyerId) query.buyerId = Number(buyerId);

        const payments = await PurchaseOrderPayment.find(query).sort({ createdAt: -1 });
        res.status(200).json(payments);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch payments", error: error.message });
    }
};

// UPDATE Payment
const updatePurchasePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentAmount, paymentDate, paymentTime, paymentModeName, remark } = req.body;

        const updatedPayment = await PurchaseOrderPayment.findByIdAndUpdate(
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
const deletePurchasePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedPayment = await PurchaseOrderPayment.findByIdAndDelete(id);

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
    createPurchasePayment,
    getSellerTotals,
    getSellerLedger,
    getPayments,
    updatePurchasePayment,
    deletePurchasePayment
};
