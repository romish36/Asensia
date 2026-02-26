const OutStock = require("../models/outStockModel");
const Product = require("../models/productModel");
const InStock = require("../models/inStockModel");
const mongoose = require("mongoose");

// Helper to get next ID
const getNextOutStockId = async () => {
    const lastDoc = await OutStock.findOne().sort({ outStockId: -1 });
    return lastDoc && lastDoc.outStockId ? lastDoc.outStockId + 1 : 1;
};

// GET ALL OutStock (Company Scoped)
const getOutStocks = async (req, res) => {
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
            conditions.push({ outQuantityDate: dateQuery });
        }

        const query = conditions.length > 0 ? { $and: conditions } : {};

        if (!page && !limit) {
            const stocks = await OutStock.find(query)
                .sort({ createdAt: -1 })
                .populate('companyId', 'companyName name');
            return res.status(200).json(stocks);
        }

        const currentPage = parseInt(page) || 1;
        const currentLimit = parseInt(limit) || 10;
        const skip = (currentPage - 1) * currentLimit;

        const [stocks, total] = await Promise.all([
            OutStock.find(query)
                .sort({ createdAt: -1 })
                .populate('companyId', 'companyName name')
                .skip(skip)
                .limit(currentLimit),
            OutStock.countDocuments(query)
        ]);

        res.status(200).json({
            outStocks: stocks,
            total,
            page: currentPage,
            pages: Math.ceil(total / currentLimit)
        });
    } catch (error) {
        console.error("Get OutStocks Error:", error);
        res.status(500).json({ message: "Failed to fetch stock out history", error: error.message });
    }
};

// CREATE OutStock (Remove Stock)
const createOutStock = async (req, res) => {
    try {
        const {
            productId,
            productName,
            outQuantity, // This is the amount to REMOVE
            outPrice,
            totalAmount,
            outQuantityDate,
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

        const qtyToRemove = Number(outQuantity);
        if (isNaN(qtyToRemove) || qtyToRemove <= 0) {
            return res.status(400).json({ message: "Invalid quantity" });
        }

        // 1. Check Product Stock Availability
        const product = await Product.findOne({ productId: Number(productId), companyId: finalCompanyId });

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        const currentStock = Number(product.productStock) || 0;
        // 2. Create OutStock Record
        const nextId = await getNextOutStockId();
        const newOutStock = new OutStock({
            outStockId: nextId,
            invoiceId: 0,
            invoiceMetaId: 0,
            invoiceNo: invoiceNo || '',
            outQuantityDate: outQuantityDate || new Date().toISOString().split('T')[0],
            productId: Number(productId),
            productName,
            outQuantity: String(qtyToRemove),
            outPrice: String(outPrice || 0),
            totalAmount: String(totalAmount || 0),
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            companyId: finalCompanyId,
            createdBy: req.user._id
        });

        await newOutStock.save();

        // 3. Update Product Stock (Decrease)
        const newStockVal = currentStock - qtyToRemove;
        product.productStock = newStockVal;

        // Auto Update Stock Type
        if (newStockVal > 0) {
            product.stockType = 1; // In Stock
        } else {
            product.stockType = 0; // Out Stock
        }

        await product.save();

        // 4. Update InStock Records (Removed as per user request - OutStock should not affect InStock table)
        /* 
        let remainingToDeduct = qtyToRemove;
        const inStockRecords = await InStock.find({
            productId: Number(productId),
            companyId: finalCompanyId
        }).sort({ inStockId: 1 }); // Oldest first

        for (const record of inStockRecords) {
            if (remainingToDeduct <= 0) break;

            let available = Number(record.inQuantity);
            if (available > 0) {
                const take = Math.min(available, remainingToDeduct);
                const newQty = available - take;

                record.inQuantity = String(newQty);
                // Update total amount based on new qty
                const price = Number(record.inPrice) || 0;
                record.totalAmount = String((newQty * price).toFixed(2));

                await record.save();
                remainingToDeduct -= take;
            }
        }
        */


        res.status(201).json(newOutStock);

    } catch (error) {
        console.error("Create OutStock Error:", error);
        res.status(500).json({ message: "Failed to remove stock", error: error.message });
    }
};

// UPDATE OutStock
// Note: modifying history is complex because we need to revert the OLD impact on product and apply NEW impact.
const updateOutStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { outQuantity, outPrice, totalAmount, outQuantityDate, invoiceNo } = req.body;

        const stockRecord = await OutStock.findById(id);
        if (!stockRecord) {
            return res.status(404).json({ message: "Stock record not found" });
        }

        const oldQty = Number(stockRecord.outQuantity);
        const newQty = Number(outQuantity);

        if (isNaN(newQty) || newQty <= 0) {
            return res.status(400).json({ message: "Invalid quantity" });
        }

        // Find Product
        const product = await Product.findOne({ productId: stockRecord.productId, companyId: stockRecord.companyId });
        if (!product) {
            return res.status(404).json({ message: "Associated product not found" });
        }

        // Calculate impact
        // If we change OutQuantity from 10 to 15, we need to remove 5 more from product.
        // Product Stock = Product Stock + OldQty - NewQty

        const currentProductStock = Number(product.productStock);
        const diff = newQty - oldQty; // e.g. 15 - 10 = 5 (need to remove 5 more)

        // Update Record
        stockRecord.outQuantity = String(newQty);
        stockRecord.outPrice = String(outPrice || stockRecord.outPrice);
        stockRecord.totalAmount = String(totalAmount || stockRecord.totalAmount);
        stockRecord.outQuantityDate = outQuantityDate || stockRecord.outQuantityDate;
        stockRecord.invoiceNo = invoiceNo || stockRecord.invoiceNo;

        await stockRecord.save();

        // Update Product
        const newStockVal = currentProductStock - diff;
        product.productStock = newStockVal;

        if (newStockVal > 0) {
            product.stockType = 1;
        } else {
            product.stockType = 0;
        }
        await product.save();

        res.status(200).json(stockRecord);

    } catch (error) {
        console.error("Update OutStock Error:", error);
        res.status(500).json({ message: "Failed to update stock out", error: error.message });
    }
};

// DELETE OutStock
const deleteOutStock = async (req, res) => {
    try {
        const { id } = req.params;
        const stockRecord = await OutStock.findById(id);

        if (!stockRecord) {
            return res.status(404).json({ message: "Stock record not found" });
        }

        // Revert Product Stock (ADD back the removed quantity)
        const qtyToRestore = Number(stockRecord.outQuantity);
        const product = await Product.findOne({ productId: stockRecord.productId, companyId: stockRecord.companyId });

        if (product) {
            const currentStock = Number(product.productStock) || 0;
            const newStockVal = currentStock + qtyToRestore;

            product.productStock = newStockVal;

            if (newStockVal > 0) {
                product.stockType = 1;
            } else {
                product.stockType = 0;
            }

            await product.save();
        }

        await OutStock.findByIdAndDelete(id);

        res.status(200).json({ message: "OutStock record deleted, stock restored" });

    } catch (error) {
        console.error("Delete OutStock Error:", error);
        res.status(500).json({ message: "Failed to delete stock", error: error.message });
    }
};

module.exports = {
    getOutStocks,
    createOutStock,
    updateOutStock,
    deleteOutStock
};
