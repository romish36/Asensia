const SaleType = require("../models/saleTypeModel");
const mongoose = require("mongoose");

// Helper to get next ID
const getNextId = async () => {
    const lastDoc = await SaleType.findOne().sort({ saleTypeId: -1 });
    return lastDoc && lastDoc.saleTypeId ? lastDoc.saleTypeId + 1 : 1;
};

// CREATE Sale Type
const createSaleType = async (req, res) => {
    try {
        const { saleTypeName, saleTypeTax1, saleTypeTax2, companyId } = req.body;

        if (!saleTypeName) {
            return res.status(400).json({ message: "Sale Type Name is required" });
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
        const existing = await SaleType.findOne({
            saleTypeName: { $regex: new RegExp(`^${saleTypeName}$`, 'i') },
            companyId: finalCompanyId
        });

        if (existing) {
            return res.status(400).json({ message: "Sale Type already exists" });
        }

        const newSaleType = new SaleType({
            saleTypeId: nextId,
            saleTypeName,
            saleTypeTax1,
            saleTypeTax2,
            companyId: finalCompanyId,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
        });

        await newSaleType.save();
        res.status(201).json({ message: "Sale Type created successfully", saleType: newSaleType });

    } catch (error) {
        console.error("Create SaleType Error:", error);
        res.status(500).json({ message: "Failed to create sale type", error: error.message });
    }
};

// GET All Sale Types (Company Scoped)
const getSaleTypes = async (req, res) => {
    try {
        const query = {};
        const { search, companyId, page, limit } = req.query;

        if (req.user.role !== 'SUPER_ADMIN') {
            query.companyId = req.user.companyId;
        } else if (companyId) {
            query.companyId = companyId;
        }

        if (search) {
            query.saleTypeName = { $regex: search, $options: 'i' };
        }

        if (!page && !limit) {
            const saleTypes = await SaleType.find(query).sort({ saleTypeName: 1 });
            return res.status(200).json(saleTypes);
        }

        const currentPage = parseInt(page) || 1;
        const currentLimit = parseInt(limit) || 10;
        const skip = (currentPage - 1) * currentLimit;

        const [saleTypes, total] = await Promise.all([
            SaleType.find(query).sort({ saleTypeName: 1 }).skip(skip).limit(currentLimit),
            SaleType.countDocuments(query)
        ]);

        res.status(200).json({
            saleTypes,
            total,
            page: currentPage,
            pages: Math.ceil(total / currentLimit)
        });

    } catch (error) {
        console.error("Get SaleTypes Error:", error);
        res.status(500).json({ message: "Failed to fetch sale types", error: error.message });
    }
};

// UPDATE Sale Type
const updateSaleType = async (req, res) => {
    try {
        const { id } = req.params;
        const { saleTypeName, saleTypeTax1, saleTypeTax2 } = req.body;

        const saleType = await SaleType.findById(id);
        if (!saleType) return res.status(404).json({ message: "Sale Type not found" });

        // Permission Check
        if (req.user.role !== 'SUPER_ADMIN' && saleType.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Uniqueness check
        if (saleTypeName && saleTypeName.toLowerCase() !== saleType.saleTypeName.toLowerCase()) {
            const existing = await SaleType.findOne({
                saleTypeName: { $regex: new RegExp(`^${saleTypeName}$`, 'i') },
                companyId: saleType.companyId,
                _id: { $ne: id }
            });
            if (existing) {
                return res.status(400).json({ message: "Sale Type name already exists" });
            }
        }

        const updated = await SaleType.findByIdAndUpdate(
            id,
            { saleTypeName, saleTypeTax1, saleTypeTax2 },
            { new: true }
        );

        res.status(200).json({ message: "Sale Type updated successfully", saleType: updated });

    } catch (error) {
        console.error("Update SaleType Error:", error);
        res.status(500).json({ message: "Failed to update sale type", error: error.message });
    }
};

// DELETE Sale Type
const deleteSaleType = async (req, res) => {
    try {
        const { id } = req.params;
        const saleType = await SaleType.findById(id);

        if (!saleType) return res.status(404).json({ message: "Sale Type not found" });

        // Permission Check
        if (req.user.role !== 'SUPER_ADMIN' && saleType.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        await SaleType.findByIdAndDelete(id);
        res.status(200).json({ message: "Sale Type deleted successfully" });

    } catch (error) {
        console.error("Delete SaleType Error:", error);
        res.status(500).json({ message: "Failed to delete sale type", error: error.message });
    }
};

module.exports = {
    createSaleType,
    getSaleTypes,
    updateSaleType,
    deleteSaleType
};
