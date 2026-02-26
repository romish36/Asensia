const Transporter = require("../models/transporterModel");
const mongoose = require("mongoose");

// const getNextTransporterId = require("../utils/getNextTransporterId"); // Removed: File does not exist

// Helper to get next ID if utility doesn't exist
const getNextId = async () => {
    const lastDoc = await Transporter.findOne().sort({ transporterId: -1 });
    return lastDoc && lastDoc.transporterId ? lastDoc.transporterId + 1 : 1;
};

// CREATE Transporter
const createTransporter = async (req, res) => {
    try {
        const {
            transporterName,
            transporterMobileNumber,
            transporterEmail,
            transporterAddress,
            transporterGst,
            companyId
        } = req.body;

        const nextId = await getNextId();

        // Scope company
        let finalCompanyId;
        if (req.user.role === 'SUPER_ADMIN') {
            finalCompanyId = companyId;
            if (!finalCompanyId) return res.status(400).json({ message: "Company ID required for Super Admin" });
        } else {
            finalCompanyId = req.user.companyId;
        }

        const newTransporter = new Transporter({
            ...req.body,
            transporterId: nextId,
            companyId: finalCompanyId,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
        });

        await newTransporter.save();
        res.status(201).json({ message: "Transporter created successfully", transporter: newTransporter });

    } catch (error) {
        console.error("Create Transporter Error:", error);
        res.status(500).json({ message: "Failed to create transporter", error: error.message });
    }
};

// GET All Transporters (Company Scoped)
const getTransporters = async (req, res) => {
    try {
        const { search, companyId, page, limit, transporterType } = req.query;
        const conditions = [];

        if (req.user.role !== 'SUPER_ADMIN') {
            conditions.push({ companyId: req.user.companyId });
        } else if (companyId) {
            conditions.push({ companyId: companyId });
        }

        if (transporterType) {
            conditions.push({ transporterType: transporterType });
        }

        if (search) {
            conditions.push({
                $or: [
                    { transporterTradeName: { $regex: search, $options: 'i' } },
                    { transporterMobileNumber: { $regex: search, $options: 'i' } },
                    { transporterCity: { $regex: search, $options: 'i' } },
                    { transporterState: { $regex: search, $options: 'i' } }
                ]
            });
        }

        const query = conditions.length > 0 ? { $and: conditions } : {};

        if (!page && !limit) {
            const transporters = await Transporter.find(query).sort({ transporterTradeName: 1 });
            return res.status(200).json(transporters);
        }

        const currentPage = parseInt(page) || 1;
        const currentLimit = parseInt(limit) || 10;
        const skip = (currentPage - 1) * currentLimit;

        const [transporters, total] = await Promise.all([
            Transporter.find(query).sort({ transporterTradeName: 1 }).skip(skip).limit(currentLimit),
            Transporter.countDocuments(query)
        ]);

        res.status(200).json({
            transporters,
            total,
            page: currentPage,
            pages: Math.ceil(total / currentLimit)
        });

    } catch (error) {
        console.error("Get Transporter Error:", error);
        res.status(500).json({ message: "Failed to fetch transporters", error: error.message });
    }
};

// GET Single Transporter
const getTransporterById = async (req, res) => {
    try {
        const transporter = await Transporter.findById(req.params.id);
        if (!transporter) return res.status(404).json({ message: "Transporter not found" });

        // Permission check
        if (req.user.role !== 'SUPER_ADMIN' && transporter.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        res.status(200).json(transporter);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// UPDATE Transporter
const updateTransporter = async (req, res) => {
    try {
        const { id } = req.params;
        const transporter = await Transporter.findById(id);

        if (!transporter) return res.status(404).json({ message: "Transporter not found" });

        // Permission Check
        if (req.user.role !== 'SUPER_ADMIN' && transporter.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        const updatedTransporter = await Transporter.findByIdAndUpdate(
            id,
            { ...req.body, updateId: req.user.userId }, // Assuming userId tracking if needed
            { new: true }
        );

        res.status(200).json({ message: "Transporter updated successfully", transporter: updatedTransporter });

    } catch (error) {
        console.error("Update Transporter Error:", error);
        res.status(500).json({ message: "Failed to update transporter", error: error.message });
    }
};

// DELETE Transporter
const deleteTransporter = async (req, res) => {
    try {
        const { id } = req.params;
        const transporter = await Transporter.findById(id);

        if (!transporter) return res.status(404).json({ message: "Transporter not found" });

        // Permission Check
        if (req.user.role !== 'SUPER_ADMIN' && transporter.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Optional: Check if used in Invoices before delete?
        // skipping for now as per simple CRUD request

        await Transporter.findByIdAndDelete(id);
        res.status(200).json({ message: "Transporter deleted successfully" });

    } catch (error) {
        console.error("Delete Transporter Error:", error);
        res.status(500).json({ message: "Failed to delete transporter", error: error.message });
    }
};

module.exports = {
    createTransporter,
    getTransporters,
    getTransporterById,
    updateTransporter,
    deleteTransporter
};
