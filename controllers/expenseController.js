const Expense = require("../models/expenseModel");

// CREATE
const createExpense = async (req, res) => {
    try {
        const expense = new Expense({
            ...req.body,
            companyId: req.user.role === 'SUPER_ADMIN' ? req.body.companyId : req.user.companyId
        });
        await expense.save();
        res.status(201).json(expense);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET ALL
const getExpenses = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, startDate, endDate, purpose, paymentMode } = req.query;
        const query = {};

        // Company filter
        if (req.user.role !== 'SUPER_ADMIN') {
            query.companyId = req.user.companyId;
        }

        // Search
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        // Filters
        if (startDate && endDate) {
            query.date = { $gte: startDate, $lte: endDate };
        } else if (startDate) {
            query.date = { $gte: startDate };
        } else if (endDate) {
            query.date = { $lte: endDate };
        }

        if (purpose) query.purpose = purpose;
        if (paymentMode) query.paymentMode = paymentMode;

        const skip = (page - 1) * limit;
        const expenses = await Expense.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Expense.countDocuments(query);

        res.status(200).json({
            expenses,
            total,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// UPDATE
const updateExpense = async (req, res) => {
    try {
        const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json(expense);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE
const deleteExpense = async (req, res) => {
    try {
        await Expense.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Expense deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createExpense,
    getExpenses,
    updateExpense,
    deleteExpense
};
