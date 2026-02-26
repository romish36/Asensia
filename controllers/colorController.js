const Color = require("../models/colorModel");
const mongoose = require("mongoose");

// Helper to get next ID
const getNextId = async () => {
    const lastDoc = await Color.findOne().sort({ colorId: -1 });
    return lastDoc && lastDoc.colorId ? lastDoc.colorId + 1 : 1;
};

// CREATE Color
const createColor = async (req, res) => {
    try {
        const { colorName, companyId } = req.body;

        if (!colorName) {
            return res.status(400).json({ message: "Color Name is required" });
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

        // Check if color already exists for this company
        const existingColor = await Color.findOne({
            colorName: { $regex: new RegExp(`^${colorName}$`, 'i') },
            companyId: finalCompanyId
        });

        if (existingColor) {
            return res.status(400).json({ message: "Color already exists" });
        }

        const newColor = new Color({
            colorId: nextId,
            colorName,
            companyId: finalCompanyId,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
        });

        await newColor.save();
        res.status(201).json({ message: "Color created successfully", color: newColor });

    } catch (error) {
        console.error("Create Color Error:", error);
        res.status(500).json({ message: "Failed to create color", error: error.message });
    }
};

// GET All Colors (Company Scoped)
const getColors = async (req, res) => {
    try {
        const query = {};
        const { search, companyId, page, limit } = req.query;

        if (req.user.role !== 'SUPER_ADMIN') {
            query.companyId = req.user.companyId;
        } else if (companyId) {
            query.companyId = companyId;
        }

        if (search) {
            query.colorName = { $regex: search, $options: 'i' };
        }

        if (!page && !limit) {
            const colors = await Color.find(query).sort({ colorName: 1 });
            return res.status(200).json(colors);
        }

        const currentPage = parseInt(page) || 1;
        const currentLimit = parseInt(limit) || 10;
        const skip = (currentPage - 1) * currentLimit;

        const [colors, total] = await Promise.all([
            Color.find(query).sort({ colorName: 1 }).skip(skip).limit(currentLimit),
            Color.countDocuments(query)
        ]);

        res.status(200).json({
            colors,
            total,
            page: currentPage,
            pages: Math.ceil(total / currentLimit)
        });

    } catch (error) {
        console.error("Get Colors Error:", error);
        res.status(500).json({ message: "Failed to fetch colors", error: error.message });
    }
};

// UPDATE Color
const updateColor = async (req, res) => {
    try {
        const { id } = req.params;
        const { colorName } = req.body;

        const color = await Color.findById(id);
        if (!color) return res.status(404).json({ message: "Color not found" });

        // Permission Check
        if (req.user.role !== 'SUPER_ADMIN' && color.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Check if new name already exists
        if (colorName && colorName.toLowerCase() !== color.colorName.toLowerCase()) {
            const existingColor = await Color.findOne({
                colorName: { $regex: new RegExp(`^${colorName}$`, 'i') },
                companyId: color.companyId,
                _id: { $ne: id }
            });
            if (existingColor) {
                return res.status(400).json({ message: "Color name already exists" });
            }
        }

        const updatedColor = await Color.findByIdAndUpdate(
            id,
            { colorName },
            { new: true }
        );

        res.status(200).json({ message: "Color updated successfully", color: updatedColor });

    } catch (error) {
        console.error("Update Color Error:", error);
        res.status(500).json({ message: "Failed to update color", error: error.message });
    }
};

// DELETE Color
const deleteColor = async (req, res) => {
    try {
        const { id } = req.params;
        const color = await Color.findById(id);

        if (!color) return res.status(404).json({ message: "Color not found" });

        // Permission Check
        if (req.user.role !== 'SUPER_ADMIN' && color.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        await Color.findByIdAndDelete(id);
        res.status(200).json({ message: "Color deleted successfully" });

    } catch (error) {
        console.error("Delete Color Error:", error);
        res.status(500).json({ message: "Failed to delete color", error: error.message });
    }
};

module.exports = {
    createColor,
    getColors,
    updateColor,
    deleteColor
};
