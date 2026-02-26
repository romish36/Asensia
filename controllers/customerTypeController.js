const CustomerType = require("../models/customerTypeModel");
const mongoose = require("mongoose");

// Helper to get next ID
const getNextId = async () => {
    const lastDoc = await CustomerType.findOne().sort({ customerTypeId: -1 });
    return lastDoc && lastDoc.customerTypeId ? lastDoc.customerTypeId + 1 : 1;
};

// CREATE Customer Type
const createCustomerType = async (req, res) => {
    try {
        const { customerTypeName, companyId } = req.body;

        if (!customerTypeName) {
            return res.status(400).json({ message: "Customer Type Name is required" });
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
        const existingType = await CustomerType.findOne({
            customerTypeName: { $regex: new RegExp(`^${customerTypeName}$`, 'i') },
            companyId: finalCompanyId
        });

        if (existingType) {
            return res.status(400).json({ message: "Customer Type already exists" });
        }

        const newType = new CustomerType({
            customerTypeId: nextId,
            customerTypeName,
            companyId: finalCompanyId,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            // insertId can be added if needed as Number, but user token ID is string ObjectId
        });

        await newType.save();
        res.status(201).json({ message: "Customer Type created successfully", customerType: newType });

    } catch (error) {
        console.error("Create CustomerType Error:", error);
        res.status(500).json({ message: "Failed to create customer type", error: error.message });
    }
};

// GET All Customer Types
const getCustomerTypes = async (req, res) => {
    try {
        const query = {};
        const { search, companyId, page, limit } = req.query;

        if (req.user.role !== 'SUPER_ADMIN') {
            query.companyId = req.user.companyId;
        } else if (companyId) {
            query.companyId = companyId;
        }

        if (search) {
            query.customerTypeName = { $regex: search, $options: 'i' };
        }

        if (!page && !limit) {
            const customerTypes = await CustomerType.find(query).sort({ customerTypeName: 1 });
            return res.status(200).json(customerTypes);
        }

        const currentPage = parseInt(page) || 1;
        const currentLimit = parseInt(limit) || 10;
        const skip = (currentPage - 1) * currentLimit;

        const [customerTypes, total] = await Promise.all([
            CustomerType.find(query).sort({ customerTypeName: 1 }).skip(skip).limit(currentLimit),
            CustomerType.countDocuments(query)
        ]);

        res.status(200).json({
            customerTypes,
            total,
            page: currentPage,
            pages: Math.ceil(total / currentLimit)
        });

    } catch (error) {
        console.error("Get CustomerTypes Error:", error);
        res.status(500).json({ message: "Failed to fetch customer types", error: error.message });
    }
};

// UPDATE Customer Type
const updateCustomerType = async (req, res) => {
    try {
        const { id } = req.params;
        const { customerTypeName } = req.body;

        const customerType = await CustomerType.findById(id);
        if (!customerType) return res.status(404).json({ message: "Customer Type not found" });

        // Permission Check
        if (req.user.role !== 'SUPER_ADMIN' && customerType.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Uniqueness check
        if (customerTypeName && customerTypeName.toLowerCase() !== customerType.customerTypeName.toLowerCase()) {
            const existing = await CustomerType.findOne({
                customerTypeName: { $regex: new RegExp(`^${customerTypeName}$`, 'i') },
                companyId: customerType.companyId,
                _id: { $ne: id }
            });
            if (existing) {
                return res.status(400).json({ message: "Customer Type Name already exists" });
            }
        }

        const updatedType = await CustomerType.findByIdAndUpdate(
            id,
            { customerTypeName },
            { new: true }
        );

        res.status(200).json({ message: "Customer Type updated successfully", customerType: updatedType });

    } catch (error) {
        console.error("Update CustomerType Error:", error);
        res.status(500).json({ message: "Failed to update customer type", error: error.message });
    }
};

// DELETE Customer Type
const deleteCustomerType = async (req, res) => {
    try {
        const { id } = req.params;
        const customerType = await CustomerType.findById(id);

        if (!customerType) return res.status(404).json({ message: "Customer Type not found" });

        // Permission Check
        if (req.user.role !== 'SUPER_ADMIN' && customerType.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        await CustomerType.findByIdAndDelete(id);
        res.status(200).json({ message: "Customer Type deleted successfully" });

    } catch (error) {
        console.error("Delete CustomerType Error:", error);
        res.status(500).json({ message: "Failed to delete customer type", error: error.message });
    }
};

module.exports = {
    createCustomerType,
    getCustomerTypes,
    updateCustomerType,
    deleteCustomerType
};
