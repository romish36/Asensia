const InvoiceName = require("../models/invoiceNameModel");
const mongoose = require("mongoose");

// Helper to get next ID
const getNextId = async () => {
    const lastDoc = await InvoiceName.findOne().sort({ invoiceNameId: -1 });
    return lastDoc && lastDoc.invoiceNameId ? lastDoc.invoiceNameId + 1 : 1;
};

// CREATE Invoice Name
const createInvoiceName = async (req, res) => {
    try {
        const { invoiceShortName, companyId } = req.body;

        if (!invoiceShortName) {
            return res.status(400).json({ message: "Invoice Name is required" });
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

        // Check if exists for this company
        const existing = await InvoiceName.findOne({
            invoiceShortName: { $regex: new RegExp(`^${invoiceShortName}$`, 'i') },
            companyId: finalCompanyId
        });

        if (existing) {
            return res.status(400).json({ message: "Invoice Name already exists" });
        }

        const newInvoiceName = new InvoiceName({
            invoiceNameId: nextId,
            invoiceShortName,
            companyId: finalCompanyId,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString()
        });

        await newInvoiceName.save();
        res.status(201).json({ message: "Invoice Name created successfully", invoiceName: newInvoiceName });

    } catch (error) {
        console.error("Create InvoiceName Error:", error);
        res.status(500).json({ message: "Failed to create invoice name", error: error.message });
    }
};

// GET All Invoice Names
const getInvoiceNames = async (req, res) => {
    try {
        const query = {};
        const { search, companyId, page, limit } = req.query;

        if (req.user.role !== 'SUPER_ADMIN') {
            query.companyId = req.user.companyId;
        } else if (companyId) {
            query.companyId = companyId;
        }

        if (search) {
            query.invoiceShortName = { $regex: search, $options: 'i' };
        }

        if (!page && !limit) {
            const invoiceNames = await InvoiceName.find(query).sort({ invoiceShortName: 1 });
            return res.status(200).json(invoiceNames);
        }

        const currentPage = parseInt(page) || 1;
        const currentLimit = parseInt(limit) || 10;
        const skip = (currentPage - 1) * currentLimit;

        const [invoiceNames, total] = await Promise.all([
            InvoiceName.find(query).sort({ invoiceShortName: 1 }).skip(skip).limit(currentLimit),
            InvoiceName.countDocuments(query)
        ]);

        res.status(200).json({
            invoiceNames,
            total,
            page: currentPage,
            pages: Math.ceil(total / currentLimit)
        });

    } catch (error) {
        console.error("Get InvoiceNames Error:", error);
        res.status(500).json({ message: "Failed to fetch invoice names", error: error.message });
    }
};

// UPDATE Invoice Name
const updateInvoiceName = async (req, res) => {
    try {
        const { id } = req.params;
        const { invoiceShortName } = req.body;

        const invoiceName = await InvoiceName.findById(id);
        if (!invoiceName) return res.status(404).json({ message: "Invoice Name not found" });

        // Permission Check
        if (req.user.role !== 'SUPER_ADMIN' && invoiceName.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Uniqueness check
        if (invoiceShortName && invoiceShortName.toLowerCase() !== invoiceName.invoiceShortName.toLowerCase()) {
            const existing = await InvoiceName.findOne({
                invoiceShortName: { $regex: new RegExp(`^${invoiceShortName}$`, 'i') },
                companyId: invoiceName.companyId,
                _id: { $ne: id }
            });
            if (existing) {
                return res.status(400).json({ message: "Invoice Name already exists" });
            }
        }

        const updated = await InvoiceName.findByIdAndUpdate(
            id,
            { invoiceShortName },
            { new: true }
        );

        res.status(200).json({ message: "Invoice Name updated successfully", invoiceName: updated });

    } catch (error) {
        console.error("Update InvoiceName Error:", error);
        res.status(500).json({ message: "Failed to update invoice name", error: error.message });
    }
};

// DELETE Invoice Name
const deleteInvoiceName = async (req, res) => {
    try {
        const { id } = req.params;
        const invoiceName = await InvoiceName.findById(id);

        if (!invoiceName) return res.status(404).json({ message: "Invoice Name not found" });

        // Permission Check
        if (req.user.role !== 'SUPER_ADMIN' && invoiceName.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        await InvoiceName.findByIdAndDelete(id);
        res.status(200).json({ message: "Invoice Name deleted successfully" });

    } catch (error) {
        console.error("Delete InvoiceName Error:", error);
        res.status(500).json({ message: "Failed to delete invoice name", error: error.message });
    }
};

module.exports = {
    createInvoiceName,
    getInvoiceNames,
    updateInvoiceName,
    deleteInvoiceName
};
