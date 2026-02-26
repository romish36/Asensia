const SalesInvoice = require("../models/salesInvoiceModel");
const Product = require("../models/productModel");
const OutStock = require("../models/outStockModel");
const Category = require("../models/categoryModel");
const InvoiceMeta = require("../models/invoiceMetaModel");
const Color = require("../models/colorModel");
const Grade = require("../models/gradeModel");
const mongoose = require("mongoose");

// Helper to get next ID
const getNextId = async () => {
    const lastDoc = await SalesInvoice.findOne().sort({ invoiceId: -1 });
    return lastDoc && lastDoc.invoiceId ? lastDoc.invoiceId + 1 : 1;
};

const getNextOutStockId = async () => {
    const lastDoc = await OutStock.findOne().sort({ outStockId: -1 });
    return lastDoc && lastDoc.outStockId ? lastDoc.outStockId + 1 : 1;
};

const getNextInvoiceMetaId = async () => {
    const lastDoc = await InvoiceMeta.findOne().sort({ invoiceMetaId: -1 });
    return lastDoc && lastDoc.invoiceMetaId ? lastDoc.invoiceMetaId + 1 : 1;
};

const BundleItem = require("../models/bundleItemModel");

// Helper for reverting stock when Invoice is edited or deleted
const revertStockEffect = async (invoice) => {
    if (invoice.items && Array.isArray(invoice.items)) {
        for (const item of invoice.items) {
            // Find category first to ensure we get the right product
            const categoryDoc = await Category.findOne({ categoryName: item.category, companyId: invoice.companyId });

            const prodQuery = { productName: item.product, companyId: invoice.companyId };
            if (categoryDoc) {
                prodQuery.categoryId = categoryDoc._id;
            }

            const prod = await Product.findOne(prodQuery);
            if (prod) {
                const quantityToRevert = Number(item.quantity) || 0;

                // Check if Bundle
                if (Number(prod.productType) === 1) { // 1 = Bundle
                    // Find bundle items
                    const bundleItems = await BundleItem.find({ productBundleId: prod.productId });

                    // Revert stock for each item in the bundle
                    for (const bundleItem of bundleItems) {
                        const childProd = await Product.findOne({ productId: bundleItem.productId });
                        if (childProd) {
                            // Revert Quantity = Bundle Quantity * 1 (Assuming 1 unit of child per bundle item entry)
                            // Ideally, a bundle item might have its own quantity within the bundle, but current schema seems to just link productIds.
                            // However, based on user request: "3 product in bundle... quantity is 2 then all 3 product minus 2 quantity"
                            // This implies 1:1 mapping in the bundle definition or multiple entries in `bundleItems` for multiple quantities.
                            // The `bundleItems` is a list of items. If a product appears twice, it's processed twice?
                            // Based on `bundleItemModel`, it links `productId`. If multiple same products in bundle, we should loop them.

                            childProd.productStock = (childProd.productStock || 0) + quantityToRevert;
                            await childProd.save();
                        }
                    }
                    // Note: We do NOT revert stock for the Bundle Product itself as it likely doesn't have physical stock, 
                    // OR if it does, the user didn't specify. Usually bundles are virtual.
                    // If user wants bundle stock tracking too, we would uncomment:
                    // prod.productStock = (prod.productStock || 0) + quantityToRevert;
                    // await prod.save();

                } else {
                    // Normal Product
                    prod.productStock = (prod.productStock || 0) + quantityToRevert;
                    await prod.save();
                }
            }
        }
    }
    // Delete associated OutStock records
    await OutStock.deleteMany({ invoiceId: invoice.invoiceId, companyId: invoice.companyId });
    // Delete associated InvoiceMeta records
    await InvoiceMeta.deleteMany({ invoiceId: invoice.invoiceId, companyId: invoice.companyId });
};

// Helper for applying stock and saving meta when Invoice is created or edited
const applyStockEffect = async (invoice, reqUser) => {
    if (invoice.items && Array.isArray(invoice.items)) {
        let currentOutStockId = await getNextOutStockId();
        let currentMetaId = await getNextInvoiceMetaId();

        for (let i = 0; i < invoice.items.length; i++) {
            const item = invoice.items[i];

            // 1. Find or establish IDs for Meta
            const categoryDocForProd = await Category.findOne({
                categoryName: item.category,
                companyId: invoice.companyId
            });

            const prodQueryForApply = {
                productName: item.product,
                companyId: invoice.companyId
            };
            if (categoryDocForProd) {
                prodQueryForApply.categoryId = categoryDocForProd._id;
            }

            const productDoc = await Product.findOne(prodQueryForApply);

            const colorDoc = await Color.findOne({
                colorName: item.color,
                companyId: invoice.companyId
            });

            const gradeDoc = await Grade.findOne({
                gradeName: item.grade,
                companyId: invoice.companyId
            });

            // 2. Create InvoiceMeta record (Always created for the line item on invoice)
            const metaEntry = new InvoiceMeta({
                invoiceMetaId: currentMetaId++,
                invoiceId: invoice.invoiceId,
                invoiceDate: invoice.invoiceDate,
                sizeId: productDoc?.sizeId || item.sizeId,
                sizeName: productDoc?.sizeName || item.sizeName,
                productId: productDoc?.productId,
                productName: productDoc?.productName || item.product,
                productHsnCode: productDoc?.productHsnCode || productDoc?.hsnCode || item.hsnCode,
                gradeId: gradeDoc?.gradeId,
                productGrade: gradeDoc?.gradeName || item.grade,
                modelNumber: item.modelNumber,
                colorId: colorDoc?.colorId,
                colorName: colorDoc?.colorName || item.color,
                unit: item.unit || 'PCS',
                quantity: String(item.quantity),
                rate: String(item.rate),
                total: String(item.total),
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString(),
                companyId: invoice.companyId,
                insertId: reqUser.userId
            });
            await metaEntry.save();

            if (productDoc) {
                const quantityToDeduct = Number(item.quantity) || 0;

                // Check if Bundle
                if (Number(productDoc.productType) === 1) { // 1 = Bundle
                    // Handle Bundle Logic
                    const bundleItems = await BundleItem.find({ productBundleId: productDoc.productId });

                    for (const bundleItem of bundleItems) {
                        const childProd = await Product.findOne({ productId: bundleItem.productId });

                        if (childProd) {
                            // Deduct Stock from Child Product
                            childProd.productStock = (childProd.productStock || 0) - quantityToDeduct;
                            await childProd.save();

                            // Create OutStock Entry for CHILD Product
                            // The user wants to see the individual items in OutStock
                            const outStockEntry = new OutStock({
                                outStockId: currentOutStockId++,
                                invoiceId: invoice.invoiceId,
                                invoiceMetaId: metaEntry.invoiceMetaId, // Link to the parent invoice line meta
                                invoiceNo: invoice.invoiceNo,
                                outQuantityDate: invoice.invoiceDate,
                                productId: childProd.productId,       // Child ID
                                productName: childProd.productName,   // Child Name
                                outQuantity: String(quantityToDeduct), // Deducted amount (Bundle Qty * 1)
                                outPrice: String(childProd.productSalePrice || 0), // Use child price or pro-rated? Usually child price or 0 if part of bundle. 
                                // User didn't specify price logic for out stock, but OutStock usually tracks quantity. 
                                // Let's use 0 or keep it simple.
                                totalAmount: "0", // Bundle carries the amount, child is just stock deduction
                                date: new Date().toLocaleDateString(),
                                time: new Date().toLocaleTimeString(),
                                companyId: invoice.companyId,
                                createdBy: reqUser._id
                            });
                            await outStockEntry.save();
                        }
                    }

                } else {
                    // Normal Product Logic

                    // 3. Update Product Stock (SUBTRACT)
                    productDoc.productStock = (productDoc.productStock || 0) - quantityToDeduct;
                    await productDoc.save();

                    // 4. Create OutStock record
                    const outStockEntry = new OutStock({
                        outStockId: currentOutStockId++,
                        invoiceId: invoice.invoiceId,
                        invoiceMetaId: metaEntry.invoiceMetaId,
                        invoiceNo: invoice.invoiceNo,
                        outQuantityDate: invoice.invoiceDate,
                        productId: productDoc.productId,
                        productName: productDoc.productName,
                        outQuantity: String(item.quantity),
                        outPrice: String(item.rate),
                        totalAmount: String(item.total),
                        date: new Date().toLocaleDateString(),
                        time: new Date().toLocaleTimeString(),
                        companyId: invoice.companyId,
                        createdBy: reqUser._id
                    });
                    await outStockEntry.save();
                }

            } else {
                console.warn(`Product ${item.product} not found for stock deduction.`);
            }
        }
    }
};

// CREATE Invoice
const createSalesInvoice = async (req, res) => {
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

        const newInvoice = new SalesInvoice({
            ...req.body,
            invoiceId: nextId,
            companyId: finalCompanyId,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
        });

        const savedInvoice = await newInvoice.save();
        await applyStockEffect(savedInvoice, req.user);

        res.status(201).json({ message: "Invoice created successfully", invoice: savedInvoice });

    } catch (error) {
        console.error("Create Sales Invoice Error:", error);
        res.status(500).json({ message: "Failed to create invoice", error: error.message });
    }
};

// GET All Invoices (Company Scoped)
const getSalesInvoices = async (req, res) => {
    try {
        const { search, companyId, page, limit, startDate, endDate, customer } = req.query;
        const conditions = [];

        if (req.user.role !== 'SUPER_ADMIN') {
            conditions.push({ companyId: req.user.companyId });
        } else if (companyId) {
            conditions.push({ companyId: companyId });
        }

        if (search) {
            conditions.push({
                $or: [
                    { invoiceNo: { $regex: search, $options: 'i' } },
                    { customerName: { $regex: search, $options: 'i' } },
                    { customerState: { $regex: search, $options: 'i' } }
                ]
            });
        }

        if (customer) {
            conditions.push({
                $or: [
                    { customerName: { $regex: customer, $options: 'i' } },
                    { customerTradeName: { $regex: customer, $options: 'i' } }
                ]
            });
        }

        if (startDate || endDate) {
            const dateQuery = {};
            if (startDate) dateQuery.$gte = startDate;
            if (endDate) dateQuery.$lte = endDate;
            conditions.push({ invoiceDate: dateQuery });
        }

        const query = conditions.length > 0 ? { $and: conditions } : {};

        if (!page && !limit) {
            const invoices = await SalesInvoice.aggregate([
                { $match: query },
                { $sort: { createdAt: -1 } },
                {
                    $lookup: {
                        from: "customers",
                        localField: "customerId",
                        foreignField: "customerId",
                        as: "custInfo"
                    }
                },
                {
                    $addFields: {
                        customerState: {
                            $cond: {
                                if: { $and: [{ $not: ["$customerState"] }, { $gt: [{ $size: "$custInfo" }, 0] }] },
                                then: { $arrayElemAt: ["$custInfo.customerState", 0] },
                                else: "$customerState"
                            }
                        }
                    }
                },
                { $project: { custInfo: 0 } }
            ]);
            return res.status(200).json(invoices);
        }

        const currentPage = parseInt(page) || 1;
        const currentLimit = parseInt(limit) || 10;
        const skip = (currentPage - 1) * currentLimit;

        // Use aggregation to join with Customer collection if customerState is missing
        const [invoices, total] = await Promise.all([
            SalesInvoice.aggregate([
                { $match: query },
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: currentLimit },
                {
                    $lookup: {
                        from: "customers",
                        localField: "customerId",
                        foreignField: "customerId",
                        as: "custInfo"
                    }
                },
                {
                    $addFields: {
                        customerState: {
                            $cond: {
                                if: { $and: [{ $not: ["$customerState"] }, { $gt: [{ $size: "$custInfo" }, 0] }] },
                                then: { $arrayElemAt: ["$custInfo.customerState", 0] },
                                else: "$customerState"
                            }
                        }
                    }
                },
                { $project: { custInfo: 0 } }
            ]),
            SalesInvoice.countDocuments(query)
        ]);

        res.status(200).json({
            invoices,
            total,
            page: currentPage,
            pages: Math.ceil(total / currentLimit)
        });

    } catch (error) {
        console.error("Get Sales Invoices Error:", error);
        res.status(500).json({ message: "Failed to fetch invoices", error: error.message });
    }
};

// GET Single Invoice
const getSalesInvoiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const invoice = await SalesInvoice.findById(id).populate('companyId');
        if (!invoice) return res.status(404).json({ message: "Invoice not found" });

        // Permission Check
        const invoiceCompanyId = invoice.companyId._id ? invoice.companyId._id.toString() : invoice.companyId.toString();
        if (req.user.role !== 'SUPER_ADMIN' && invoiceCompanyId !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        res.status(200).json(invoice);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch invoice", error: error.message });
    }
};

// UPDATE Invoice
const updateSalesInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const invoice = await SalesInvoice.findById(id).populate('companyId');
        if (!invoice) return res.status(404).json({ message: "Invoice not found" });

        // Permission Check
        if (req.user.role !== 'SUPER_ADMIN' && invoice.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        // 1. Revert Old Stock Effect
        await revertStockEffect(invoice);

        // 2. Update Invoice
        const updatedInvoice = await SalesInvoice.findByIdAndUpdate(
            id,
            { ...req.body },
            { new: true }
        );

        // 3. Apply New Stock Effect
        await applyStockEffect(updatedInvoice, req.user);

        res.status(200).json({ message: "Invoice updated successfully", invoice: updatedInvoice });

    } catch (error) {
        console.error("Update Sales Invoice Error:", error);
        res.status(500).json({ message: "Failed to update invoice", error: error.message });
    }
};

// DELETE Invoice
const deleteSalesInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const invoice = await SalesInvoice.findById(id).populate('companyId');
        if (!invoice) return res.status(404).json({ message: "Invoice not found" });

        // Permission Check
        if (req.user.role !== 'SUPER_ADMIN' && invoice.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        // 1. Revert Stock Effect
        await revertStockEffect(invoice);

        // 2. Delete
        await SalesInvoice.findByIdAndDelete(id);
        res.status(200).json({ message: "Invoice deleted successfully" });

    } catch (error) {
        console.error("Delete Sales Invoice Error:", error);
        res.status(500).json({ message: "Failed to delete invoice", error: error.message });
    }
};

module.exports = {
    createSalesInvoice,
    getSalesInvoices,
    getSalesInvoiceById,
    updateSalesInvoice,
    deleteSalesInvoice
};
