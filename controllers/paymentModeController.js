const PaymentMode = require("../models/paymentModeModel");
const mongoose = require("mongoose");

// Helper to get next ID
const getNextId = async () => {
    const lastDoc = await PaymentMode.findOne().sort({ paymentModeId: -1 });
    return lastDoc && lastDoc.paymentModeId ? lastDoc.paymentModeId + 1 : 1;
};

// CREATE Payment Mode
const createPaymentMode = async (req, res) => {
    try {
        const { paymentModeName, companyId } = req.body;

        if (!paymentModeName) {
            return res.status(400).json({ message: "Payment Mode Name is required" });
        }

        const nextId = await getNextId();

        // Scope company
        let finalCompanyId;
        if (req.user.role === 'SUPER_ADMIN') {
            finalCompanyId = companyId;
            if (!finalCompanyId) return res.status(400).json({ message: "Company ID required for Super Admin" });
        } else {
            finalCompanyId = req.user.companyId;
        }

        // Check if payment mode already exists for this company
        const existingMode = await PaymentMode.findOne({
            paymentModeName: { $regex: new RegExp(`^${paymentModeName}$`, 'i') },
            companyId: finalCompanyId
        });

        if (existingMode) {
            return res.status(400).json({ message: "Payment mode already exists" });
        }

        const newMode = new PaymentMode({
            paymentModeId: nextId,
            paymentModeName,
            companyId: finalCompanyId,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
        });

        await newMode.save();
        res.status(201).json({ message: "Payment mode created successfully", paymentMode: newMode });

    } catch (error) {
        console.error("Create Payment Mode Error:", error);
        res.status(500).json({ message: "Failed to create payment mode", error: error.message });
    }
};

// GET All Payment Modes (Company Scoped)
const getPaymentModes = async (req, res) => {
    try {
        const query = {};
        const { search, companyId, page, limit } = req.query;

        if (req.user.role !== 'SUPER_ADMIN') {
            query.companyId = req.user.companyId;
        } else if (companyId) {
            query.companyId = companyId;
        }

        if (search) {
            query.paymentModeName = { $regex: search, $options: 'i' };
        }

        if (!page && !limit) {
            const modes = await PaymentMode.find(query).sort({ paymentModeName: 1 });
            return res.status(200).json(modes);
        }

        const currentPage = parseInt(page) || 1;
        const currentLimit = parseInt(limit) || 10;
        const skip = (currentPage - 1) * currentLimit;

        const [modes, total] = await Promise.all([
            PaymentMode.find(query).sort({ paymentModeName: 1 }).skip(skip).limit(currentLimit),
            PaymentMode.countDocuments(query)
        ]);

        res.status(200).json({
            paymentModes: modes,
            total,
            page: currentPage,
            pages: Math.ceil(total / currentLimit)
        });

    } catch (error) {
        console.error("Get Payment Modes Error:", error);
        res.status(500).json({ message: "Failed to fetch payment modes", error: error.message });
    }
};

// UPDATE Payment Mode
const updatePaymentMode = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentModeName } = req.body;

        const mode = await PaymentMode.findById(id);
        if (!mode) return res.status(404).json({ message: "Payment mode not found" });

        // Permission Check
        if (req.user.role !== 'SUPER_ADMIN' && mode.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Check if new name already exists
        if (paymentModeName && paymentModeName.toLowerCase() !== mode.paymentModeName.toLowerCase()) {
            const existingMode = await PaymentMode.findOne({
                paymentModeName: { $regex: new RegExp(`^${paymentModeName}$`, 'i') },
                companyId: mode.companyId,
                _id: { $ne: id }
            });
            if (existingMode) {
                return res.status(400).json({ message: "Payment mode name already exists" });
            }
        }

        const updatedMode = await PaymentMode.findByIdAndUpdate(
            id,
            { paymentModeName },
            { new: true }
        );

        res.status(200).json({ message: "Payment mode updated successfully", paymentMode: updatedMode });

    } catch (error) {
        console.error("Update Payment Mode Error:", error);
        res.status(500).json({ message: "Failed to update payment mode", error: error.message });
    }
};

// DELETE Payment Mode
const deletePaymentMode = async (req, res) => {
    try {
        const { id } = req.params;
        const mode = await PaymentMode.findById(id);

        if (!mode) return res.status(404).json({ message: "Payment mode not found" });

        // Permission Check
        if (req.user.role !== 'SUPER_ADMIN' && mode.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        await PaymentMode.findByIdAndDelete(id);
        res.status(200).json({ message: "Payment mode deleted successfully" });

    } catch (error) {
        console.error("Delete Payment Mode Error:", error);
        res.status(500).json({ message: "Failed to delete payment mode", error: error.message });
    }
};

module.exports = {
    createPaymentMode,
    getPaymentModes,
    updatePaymentMode,
    deletePaymentMode
};
