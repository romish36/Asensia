const InStock = require("../models/inStockModel");
const Product = require("../models/productModel");
const mongoose = require("mongoose");

// Helper to get next ID
const getNextInStockId = async () => {
    const lastDoc = await InStock.findOne().sort({ inStockId: -1 });
    return lastDoc && lastDoc.inStockId ? lastDoc.inStockId + 1 : 1;
};

// GET ALL InStock (Company Scoped)
const getInStocks = async (req, res) => {
    try {
        const { search, companyId, page, limit, startDate, endDate, product } = req.query;
        const conditions = [];

        if (req.user.role === 'SUPER_ADMIN') {
            if (companyId) {
                conditions.push({ companyId: companyId });
            }
        } else {
            conditions.push({ companyId: req.user.companyId });
        }

        if (search) {
            conditions.push({
                $or: [
                    { productName: { $regex: search, $options: 'i' } },
                    { invoiceNo: { $regex: search, $options: 'i' } }
                ]
            });
        }

        if (product) {
            conditions.push({ productName: { $regex: product, $options: 'i' } });
        }

        if (startDate || endDate) {
            const dateQuery = {};
            if (startDate) dateQuery.$gte = startDate;
            if (endDate) dateQuery.$lte = endDate;
            conditions.push({ inQuantityDate: dateQuery });
        }

        const query = conditions.length > 0 ? { $and: conditions } : {};

        if (!page && !limit) {
            const stocks = await InStock.find(query)
                .sort({ createdAt: -1 })
                .populate('companyId', 'companyName name');
            return res.status(200).json(stocks);
        }

        const currentPage = parseInt(page) || 1;
        const currentLimit = parseInt(limit) || 10;
        const skip = (currentPage - 1) * currentLimit;

        const [stocks, total] = await Promise.all([
            InStock.find(query)
                .sort({ createdAt: -1 })
                .populate('companyId', 'companyName name')
                .skip(skip)
                .limit(currentLimit),
            InStock.countDocuments(query)
        ]);

        res.status(200).json({
            inStocks: stocks,
            total,
            page: currentPage,
            pages: Math.ceil(total / currentLimit)
        });
    } catch (error) {
        console.error("Get InStocks Error:", error);
        res.status(500).json({ message: "Failed to fetch stock history", error: error.message });
    }
};

// CREATE InStock
const createInStock = async (req, res) => {
    try {
        const {
            productId,
            productName,
            inQuantity,
            inPrice,
            totalAmount,
            date,
            invoiceNo,
            companyId
        } = req.body;

        // Company Logic
        let finalCompanyId;
        if (req.user.role === 'SUPER_ADMIN') {
            if (!companyId) return res.status(400).json({ message: "Company ID required for Super Admin" });
            finalCompanyId = companyId;
        } else {
            finalCompanyId = req.user.companyId;
        }

        const qty = Number(inQuantity);
        if (isNaN(qty) || qty <= 0) {
            return res.status(400).json({ message: "Invalid quantity" });
        }

        // 1. Create InStock Record
        // 0. Find Product First
        const product = await Product.findOne({ productId: Number(productId), companyId: finalCompanyId });
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        if (product.stockType === 2) {
            return res.status(400).json({ message: "Cannot add stock to a non-inventory (Without Stock) product." });
        }

        // 1. Create InStock Record
        const nextId = await getNextInStockId();
        const newStock = new InStock({
            inStockId: nextId,
            purchaseOrderId: 0, // Default or passed if linked
            purchaseOrderMetaId: 0,
            productId, // This should match product.productId (Number)
            productName,
            inQuantity: String(qty),
            inPrice: String(inPrice || 0),
            totalAmount: String(totalAmount || 0),
            date: date || new Date().toISOString().split('T')[0],
            invoiceNo: invoiceNo || '',
            companyId: finalCompanyId,
            createdBy: req.user._id
        });

        await newStock.save();

        // 2. Update Product Stock
        const currentStock = Number(product.productStock) || 0;
        const newStockVal = currentStock + qty;

        product.productStock = newStockVal;

        // Auto Update Stock Type
        if (newStockVal > 0) {
            product.stockType = 1; // In Stock
        } else {
            product.stockType = 0; // Out Stock
        }

        await product.save();

        res.status(201).json(newStock);

    } catch (error) {
        console.error("Create InStock Error:", error);
        res.status(500).json({ message: "Failed to add stock", error: error.message });
    }
};

// UPDATE InStock
const updateInStock = async (req, res) => {
    try {
        const { id } = req.params; // Document _id or inStockId? Usually _id for updates.
        const { inQuantity, inPrice, totalAmount, date, invoiceNo } = req.body;

        const stockRecord = await InStock.findById(id);
        if (!stockRecord) {
            return res.status(404).json({ message: "Stock record not found" });
        }

        // Calculate Check Diff
        const oldQty = Number(stockRecord.inQuantity);
        const newQty = Number(inQuantity);

        if (isNaN(newQty)) {
            return res.status(400).json({ message: "Invalid quantity" });
        }

        const diff = newQty - oldQty;

        // Update Record
        stockRecord.inQuantity = String(newQty);
        stockRecord.inPrice = String(inPrice || stockRecord.inPrice);
        stockRecord.totalAmount = String(totalAmount || stockRecord.totalAmount);
        stockRecord.date = date || stockRecord.date;
        stockRecord.invoiceNo = invoiceNo || stockRecord.invoiceNo;

        await stockRecord.save();

        // Update Product Stock
        if (diff !== 0) {
            const product = await Product.findOne({ productId: stockRecord.productId, companyId: stockRecord.companyId });
            if (product) {
                const currentStock = Number(product.productStock) || 0;
                const newStockVal = currentStock + diff;
                product.productStock = newStockVal;

                // Auto Update Stock Type
                if (newStockVal > 0) {
                    product.stockType = 1;
                } else {
                    product.stockType = 0;
                }

                await product.save();
            }
        }

        res.status(200).json(stockRecord);

    } catch (error) {
        console.error("Update InStock Error:", error);
        res.status(500).json({ message: "Failed to update stock", error: error.message });
    }
};

// DELETE InStock
const deleteInStock = async (req, res) => {
    try {
        const { id } = req.params;
        const stockRecord = await InStock.findById(id);

        if (!stockRecord) {
            return res.status(404).json({ message: "Stock record not found" });
        }

        // Revert Product Stock
        const qtyToRemove = Number(stockRecord.inQuantity);
        const product = await Product.findOne({ productId: stockRecord.productId, companyId: stockRecord.companyId });

        if (product) {
            const currentStock = Number(product.productStock) || 0;
            const newStockVal = currentStock - qtyToRemove;
            product.productStock = newStockVal;

            // Auto Update Stock Type
            if (newStockVal > 0) {
                product.stockType = 1;
            } else {
                product.stockType = 0;
            }

            await product.save();
        }

        await InStock.findByIdAndDelete(id);

        res.status(200).json({ message: "Stock record deleted" });

    } catch (error) {
        console.error("Delete InStock Error:", error);
        res.status(500).json({ message: "Failed to delete stock", error: error.message });
    }
};

module.exports = {
    getInStocks,
    createInStock,
    updateInStock,
    deleteInStock
};
