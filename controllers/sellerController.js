const Seller = require("../models/sellerModel");
const mongoose = require("mongoose");

// Helper to get next ID
const getNextId = async () => {
    const lastDoc = await Seller.findOne().sort({ sellerId: -1 });
    return lastDoc && lastDoc.sellerId ? lastDoc.sellerId + 1 : 1;
};

// CREATE Seller
const createSeller = async (req, res) => {
    try {
        const nextId = await getNextId();

        // Scope company
        let finalCompanyId;
        if (req.user.role === 'SUPER_ADMIN') {
            finalCompanyId = req.body.companyId;
            if (!finalCompanyId) return res.status(400).json({ message: "Company ID required for Super Admin" });
        } else {
            finalCompanyId = req.user.companyId;
        }

        // Check for duplicate seller (only if name provided)
        if (req.body.sellerTradeName) {
            const existingSeller = await Seller.findOne({
                sellerTradeName: req.body.sellerTradeName,
                companyId: finalCompanyId
            });

            if (existingSeller) {
                return res.status(400).json({ message: "Seller is already in list" });
            }
        }

        // Clean up empty strings for ObjectId fields
        const sellerData = { ...req.body };
        if (sellerData.sellerTypeId === "") delete sellerData.sellerTypeId;
        if (sellerData.saleTypeId === "") delete sellerData.saleTypeId;

        const newSeller = new Seller({
            ...sellerData,
            sellerId: nextId,
            companyId: finalCompanyId,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
        });

        await newSeller.save();
        res.status(201).json({ message: "Seller created successfully", seller: newSeller });

    } catch (error) {
        console.error("Create Seller Error:", error);
        res.status(500).json({ message: "BACKEND_ERROR: Failed to create seller", error: error.message });
    }
};

// GET All Sellers (Company Scoped)
const getSellers = async (req, res) => {
    try {
        const { search, companyId, page, limit, sellerType, saleType } = req.query;
        const conditions = [];

        if (req.user.role !== 'SUPER_ADMIN') {
            conditions.push({ companyId: req.user.companyId });
        } else if (companyId) {
            conditions.push({ companyId: companyId });
        }

        if (search) {
            conditions.push({
                $or: [
                    { sellerTradeName: { $regex: search, $options: 'i' } },
                    { sellerGstNumber: { $regex: search, $options: 'i' } },
                    { sellerCity: { $regex: search, $options: 'i' } },
                    { sellerState: { $regex: search, $options: 'i' } }
                ]
            });
        }

        if (sellerType) {
            conditions.push({ sellerTypeId: sellerType });
        }

        if (saleType) {
            conditions.push({ saleTypeId: saleType });
        }

        const query = conditions.length > 0 ? { $and: conditions } : {};

        if (!page && !limit) {
            const sellers = await Seller.find(query)
                .populate('sellerTypeId', 'customerTypeName')
                .populate('saleTypeId', 'saleTypeName')
                .sort({ sellerTradeName: 1 });
            return res.status(200).json(sellers);
        }

        const currentPage = parseInt(page) || 1;
        const currentLimit = parseInt(limit) || 10;
        const skip = (currentPage - 1) * currentLimit;

        const [sellers, total] = await Promise.all([
            Seller.find(query)
                .populate('sellerTypeId', 'customerTypeName')
                .populate('saleTypeId', 'saleTypeName')
                .sort({ sellerTradeName: 1 })
                .skip(skip)
                .limit(currentLimit),
            Seller.countDocuments(query)
        ]);

        res.status(200).json({
            sellers,
            total,
            page: currentPage,
            pages: Math.ceil(total / currentLimit)
        });

    } catch (error) {
        console.error("Get Sellers Error:", error);
        res.status(500).json({ message: "Failed to fetch sellers", error: error.message });
    }
};

// UPDATE Seller
const updateSeller = async (req, res) => {
    try {
        const { id } = req.params;
        const seller = await Seller.findById(id);
        if (!seller) return res.status(404).json({ message: "Seller not found" });

        // Permission Check
        if (req.user.role !== 'SUPER_ADMIN' && seller.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Check for duplicate seller name on update (excluding current record, only if name provided)
        if (req.body.sellerTradeName && req.body.sellerTradeName !== seller.sellerTradeName) {
            if (req.body.sellerTradeName) {
                const existingDuplicate = await Seller.findOne({
                    sellerTradeName: req.body.sellerTradeName,
                    companyId: seller.companyId,
                    _id: { $ne: id }
                });

                if (existingDuplicate) {
                    return res.status(400).json({ message: "Seller is already in list" });
                }
            }
        }

        // Clean up empty strings for ObjectId fields
        const updateData = { ...req.body };
        if (updateData.sellerTypeId === "") delete updateData.sellerTypeId;
        if (updateData.saleTypeId === "") delete updateData.saleTypeId;

        const updatedSeller = await Seller.findByIdAndUpdate(
            id,
            { ...updateData },
            { new: true }
        );

        res.status(200).json({ message: "Seller updated successfully", seller: updatedSeller });

    } catch (error) {
        console.error("Update Seller Error:", error);
        res.status(500).json({ message: "BACKEND_ERROR: Failed to update seller", error: error.message });
    }
};

// DELETE Seller
const deleteSeller = async (req, res) => {
    try {
        const { id } = req.params;
        const seller = await Seller.findById(id);

        if (!seller) return res.status(404).json({ message: "Seller not found" });

        // Permission Check
        if (req.user.role !== 'SUPER_ADMIN' && seller.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        await Seller.findByIdAndDelete(id);
        res.status(200).json({ message: "Seller deleted successfully" });

    } catch (error) {
        console.error("Delete Seller Error:", error);
        res.status(500).json({ message: "Failed to delete seller", error: error.message });
    }
};

// GET Single Seller by Custom ID (numeric sellerId)
const getSellerByCustomId = async (req, res) => {
    try {
        const { id } = req.params; // this is the sellerId Number
        const seller = await Seller.findOne({ sellerId: Number(id) })
            .populate('sellerTypeId', 'customerTypeName')
            .populate('saleTypeId', 'saleTypeName');

        if (!seller) return res.status(404).json({ message: "Seller not found" });

        // Permission Check
        if (req.user.role !== 'SUPER_ADMIN' && seller.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        res.status(200).json(seller);

    } catch (error) {
        console.error("Get Seller By Custom ID Error:", error);
        res.status(500).json({ message: "Failed to fetch seller", error: error.message });
    }
};

module.exports = {
    createSeller,
    getSellers,
    updateSeller,
    deleteSeller,
    getSellerByCustomId
};
