const Customer = require("../models/customerModel");
const mongoose = require("mongoose");

// Helper to get next ID
const getNextId = async () => {
    const lastDoc = await Customer.findOne().sort({ customerId: -1 });
    return lastDoc && lastDoc.customerId ? lastDoc.customerId + 1 : 1;
};

// CREATE Customer
const createCustomer = async (req, res) => {
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

        // Check for duplicate customer (only if name provided)
        if (req.body.customerTradeName) {
            const existingCustomer = await Customer.findOne({
                customerTradeName: req.body.customerTradeName,
                companyId: finalCompanyId
            });

            if (existingCustomer) {
                return res.status(400).json({ message: "Customer with this trade name already exists for this company" });
            }
        }

        // Clean up empty strings for ObjectId fields to avoid casting errors
        const customerData = { ...req.body };
        if (customerData.customerTypeId === "") delete customerData.customerTypeId;
        if (customerData.saleTypeId === "") delete customerData.saleTypeId;

        const newCustomer = new Customer({
            ...customerData,
            customerId: nextId,
            companyId: finalCompanyId,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
        });

        await newCustomer.save();
        res.status(201).json({ message: "Customer created successfully", customer: newCustomer });

    } catch (error) {
        console.error("Create Customer Error:", error);
        res.status(500).json({ message: "Failed to create customer", error: error.message });
    }
};

// GET All Customers (Company Scoped)
const getCustomers = async (req, res) => {
    try {
        const { search, companyId, page, limit, customerType, saleType } = req.query;
        const conditions = [];

        if (req.user.role !== 'SUPER_ADMIN') {
            conditions.push({ companyId: req.user.companyId });
        } else if (companyId) {
            conditions.push({ companyId: companyId });
        }

        if (search) {
            conditions.push({
                $or: [
                    { customerTradeName: { $regex: search, $options: 'i' } },
                    { customerGstNumber: { $regex: search, $options: 'i' } },
                    { customerCity: { $regex: search, $options: 'i' } },
                    { customerState: { $regex: search, $options: 'i' } }
                ]
            });
        }

        if (customerType) {
            conditions.push({ customerTypeId: customerType });
        }

        if (saleType) {
            conditions.push({ saleTypeId: saleType });
        }

        const query = conditions.length > 0 ? { $and: conditions } : {};

        if (!page && !limit) {
            const customers = await Customer.find(query)
                .populate('customerTypeId', 'customerTypeName')
                .populate('saleTypeId', 'saleTypeName')
                .sort({ customerTradeName: 1 });
            return res.status(200).json(customers);
        }

        const currentPage = parseInt(page) || 1;
        const currentLimit = parseInt(limit) || 10;
        const skip = (currentPage - 1) * currentLimit;

        const [customers, total] = await Promise.all([
            Customer.find(query)
                .populate('customerTypeId', 'customerTypeName')
                .populate('saleTypeId', 'saleTypeName')
                .sort({ customerTradeName: 1 })
                .skip(skip)
                .limit(currentLimit),
            Customer.countDocuments(query)
        ]);

        res.status(200).json({
            customers,
            total,
            page: currentPage,
            pages: Math.ceil(total / currentLimit)
        });

    } catch (error) {
        console.error("Get Customers Error:", error);
        res.status(500).json({ message: "Failed to fetch customers", error: error.message });
    }
};

// UPDATE Customer
const updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const customer = await Customer.findById(id);
        if (!customer) return res.status(404).json({ message: "Customer not found" });

        // Permission Check
        if (req.user.role !== 'SUPER_ADMIN' && customer.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        const updatedCustomer = await Customer.findByIdAndUpdate(
            id,
            { ...req.body },
            { new: true }
        );

        res.status(200).json({ message: "Customer updated successfully", customer: updatedCustomer });

    } catch (error) {
        console.error("Update Customer Error:", error);
        res.status(500).json({ message: "Failed to update customer", error: error.message });
    }
};

// DELETE Customer
const deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const customer = await Customer.findById(id);

        if (!customer) return res.status(404).json({ message: "Customer not found" });

        // Permission Check
        if (req.user.role !== 'SUPER_ADMIN' && customer.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        await Customer.findByIdAndDelete(id);
        res.status(200).json({ message: "Customer deleted successfully" });

    } catch (error) {
        console.error("Delete Customer Error:", error);
        res.status(500).json({ message: "Failed to delete customer", error: error.message });
    }
};

// GET Single Customer by MongoDB ID
const getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;
        const customer = await Customer.findById(id)
            .populate('customerTypeId', 'customerTypeName')
            .populate('saleTypeId', 'saleTypeName');

        if (!customer) return res.status(404).json({ message: "Customer not found" });

        // Permission Check
        if (req.user.role !== 'SUPER_ADMIN' && customer.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        res.status(200).json(customer);

    } catch (error) {
        console.error("Get Customer Error:", error);
        res.status(500).json({ message: "Failed to fetch customer", error: error.message });
    }
};

// GET Single Customer by custom Number ID
const getCustomerByCustomId = async (req, res) => {
    try {
        const { id } = req.params; // this is the customerId Number
        const customer = await Customer.findOne({ customerId: Number(id) })
            .populate('customerTypeId', 'customerTypeName')
            .populate('saleTypeId', 'saleTypeName');

        if (!customer) return res.status(404).json({ message: "Customer not found" });

        // Permission Check
        if (req.user.role !== 'SUPER_ADMIN' && customer.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        res.status(200).json(customer);

    } catch (error) {
        console.error("Get Customer By Custom ID Error:", error);
        res.status(500).json({ message: "Failed to fetch customer", error: error.message });
    }
};

module.exports = {
    createCustomer,
    getCustomers,
    updateCustomer,
    deleteCustomer,
    getCustomerById,
    getCustomerByCustomId
};
