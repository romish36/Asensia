const PurchaseOrder = require("../models/purchaseOrderModel");
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const InStock = require("../models/inStockModel");
const PurchaseOrderMeta = require("../models/purchaseOrderMetaModel");
const Color = require("../models/colorModel");
const Grade = require("../models/gradeModel");
const mongoose = require("mongoose");

// Helper to get next ID
const getNextId = async () => {
    const lastDoc = await PurchaseOrder.findOne().sort({ purchaseOrderId: -1 });
    return lastDoc && lastDoc.purchaseOrderId ? lastDoc.purchaseOrderId + 1 : 1;
};

const getNextCategoryId = async () => {
    const lastDoc = await Category.findOne().sort({ categoryId: -1 });
    return lastDoc && lastDoc.categoryId ? lastDoc.categoryId + 1 : 1;
};

const getNextProductId = async () => {
    const lastDoc = await Product.findOne().sort({ productId: -1 });
    return lastDoc && lastDoc.productId ? lastDoc.productId + 1 : 1;
};

const getNextInStockId = async () => {
    const lastDoc = await InStock.findOne().sort({ inStockId: -1 });
    return lastDoc && lastDoc.inStockId ? lastDoc.inStockId + 1 : 1;
};

const getNextPurchaseOrderMetaId = async () => {
    const lastDoc = await PurchaseOrderMeta.findOne().sort({ purchaseOrderMetaId: -1 });
    return lastDoc && lastDoc.purchaseOrderMetaId ? lastDoc.purchaseOrderMetaId + 1 : 1;
};

// Helper for reverting stock when PO is edited or deleted
const revertStockEffect = async (purchaseOrder) => {
    if (purchaseOrder.items && Array.isArray(purchaseOrder.items)) {
        for (const item of purchaseOrder.items) {
            // Find category by name for this company
            const cat = await Category.findOne({ categoryName: item.category, companyId: purchaseOrder.companyId });
            if (cat) {
                // Find product by name and categoryId
                const prod = await Product.findOne({ productName: item.product, categoryId: cat._id, companyId: purchaseOrder.companyId });
                if (prod) {
                    if (prod.stockType !== 2) {
                        prod.productStock = (prod.productStock || 0) - (Number(item.quantity) || 0);
                        await prod.save();
                    }
                }
            }
        }
    }
    // Delete associated InStock records
    await InStock.deleteMany({ purchaseOrderId: purchaseOrder.purchaseOrderId, companyId: purchaseOrder.companyId });

    // Delete associated PurchaseOrderMeta records
    await PurchaseOrderMeta.deleteMany({ purchaseOrderId: purchaseOrder.purchaseOrderId });
};

// Helper for applying stock when PO is created or edited
const applyStockEffect = async (purchaseOrder, reqUser) => {
    if (purchaseOrder.items && Array.isArray(purchaseOrder.items)) {
        let currentInStockId = await getNextInStockId();
        let currentPurchaseOrderMetaId = await getNextPurchaseOrderMetaId();
        let currentCategoryId = await getNextCategoryId();
        let currentProductId = await getNextProductId();

        for (let i = 0; i < purchaseOrder.items.length; i++) {
            const item = purchaseOrder.items[i];

            // 1. Find or Create Category
            let categoryDoc = await Category.findOne({
                categoryName: item.category,
                companyId: purchaseOrder.companyId
            });

            if (!categoryDoc) {
                categoryDoc = new Category({
                    categoryId: currentCategoryId++,
                    categoryName: item.category,
                    companyId: purchaseOrder.companyId,
                    createdBy: reqUser._id
                });
                await categoryDoc.save();
            }

            // 2. Find or Create Product
            let productDoc = await Product.findOne({
                productName: item.product,
                categoryId: categoryDoc._id,
                companyId: purchaseOrder.companyId
            });

            if (!productDoc) {
                productDoc = new Product({
                    productId: currentProductId++,
                    productName: item.product,
                    categoryId: categoryDoc._id,
                    companyId: purchaseOrder.companyId,
                    productHsnCode: item.hsnCode || "",
                    productGrade: item.grade || "",
                    productDesignName: item.modelNumber || "",
                    productFinshGlaze: item.productFinishGlaze || "",
                    productSalePrice: item.productSalePrice ? String(item.productSalePrice) : "0",
                    productStock: 0,
                    createdBy: reqUser._id,
                    date: new Date().toLocaleDateString(),
                    time: new Date().toLocaleTimeString()
                });
                await productDoc.save();
            } else {
                // Update existing product details if provided in the PO
                if (item.hsnCode) productDoc.productHsnCode = item.hsnCode;
                if (item.grade) productDoc.productGrade = item.grade;
                if (item.modelNumber) productDoc.productDesignName = item.modelNumber;
                if (item.productFinishGlaze) productDoc.productFinshGlaze = item.productFinishGlaze;
                // Update Sale Price if provided
                if (item.productSalePrice) productDoc.productSalePrice = String(item.productSalePrice);

                await productDoc.save();
            }

            // 3. Update Product Stock
            const quantityToAdd = Number(item.quantity) || 0;
            if (productDoc.stockType !== 2) {
                productDoc.productStock = (productDoc.productStock || 0) + quantityToAdd;
                await productDoc.save();
            }

            // 4. Create InStock record
            if (productDoc.stockType !== 2) {
                const inStockEntry = new InStock({
                    inStockId: currentInStockId++,
                    purchaseOrderId: purchaseOrder.purchaseOrderId,
                    purchaseOrderMetaId: i + 1,
                    invoiceNo: purchaseOrder.invoiceNo,
                    inQuantityDate: purchaseOrder.invoiceDate,
                    productId: productDoc.productId,
                    productName: productDoc.productName,
                    inQuantity: String(item.quantity),
                    inPrice: String(item.rate),
                    totalAmount: String(item.total),
                    date: new Date().toLocaleDateString(),
                    time: new Date().toLocaleTimeString(),
                    companyId: purchaseOrder.companyId,
                    createdBy: reqUser._id
                });
                await inStockEntry.save();
            }

            // 5. Create PurchaseOrderMeta record
            let colorId = null;
            if (item.color) {
                const colorDoc = await Color.findOne({ colorName: item.color, companyId: purchaseOrder.companyId });
                if (colorDoc) colorId = colorDoc.colorId;
            }

            let gradeId = null;
            if (item.grade) {
                const gradeDoc = await Grade.findOne({ gradeName: item.grade, companyId: purchaseOrder.companyId });
                if (gradeDoc) gradeId = gradeDoc.gradeId;
            }

            const purchaseOrderMetaEntry = new PurchaseOrderMeta({
                purchaseOrderMetaId: currentPurchaseOrderMetaId++,
                purchaseOrderId: purchaseOrder.purchaseOrderId,
                invoiceDate: purchaseOrder.invoiceDate,

                sizeId: productDoc.sizeId || null,
                sizeName: productDoc.sizeName || "",

                productId: productDoc.productId,
                productName: productDoc.productName,
                productHsnCode: productDoc.productHsnCode || "",

                gradeId: gradeId,
                productGrade: item.grade || "",

                unit: item.unit || "",

                colorId: colorId,
                colorName: item.color || "",

                quantity: String(item.quantity) || "0",
                rate: String(item.rate) || "0",
                total: String(item.total) || "0",

                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString(),

                insertId: reqUser.userId,   // utilizing userId (Number) from User model
            });
            await purchaseOrderMetaEntry.save();
        }
    }
};

// CREATE Purchase Invoice
const createPurchaseOrder = async (req, res) => {
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

        const newPurchaseOrder = new PurchaseOrder({
            ...req.body,
            purchaseOrderId: nextId,
            companyId: finalCompanyId,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
        });

        const savedPO = await newPurchaseOrder.save();
        await applyStockEffect(savedPO, req.user);

        res.status(201).json({ message: "Purchase invoice created successfully", purchaseOrder: savedPO });

    } catch (error) {
        console.error("Create Purchase Order Error:", error);
        res.status(500).json({ message: "Failed to create purchase invoice", error: error.message });
    }
};

// GET All Purchase Invoices (Company Scoped)
const getPurchaseOrders = async (req, res) => {
    try {
        const conditions = [];
        const { search, companyId, page, limit, startDate, endDate, seller } = req.query;

        if (req.user.role !== 'SUPER_ADMIN') {
            conditions.push({ companyId: req.user.companyId });
        } else if (companyId) {
            conditions.push({ companyId: companyId });
        }

        if (search) {
            conditions.push({
                $or: [
                    { invoiceNo: { $regex: search, $options: 'i' } },
                    { companyName: { $regex: search, $options: 'i' } }
                ]
            });
        }

        if (seller) {
            conditions.push({ companyName: { $regex: seller, $options: 'i' } });
        }

        if (startDate || endDate) {
            const dateQuery = {};
            if (startDate) dateQuery.$gte = startDate;
            if (endDate) dateQuery.$lte = endDate;
            conditions.push({ invoiceDate: dateQuery });
        }

        const query = conditions.length > 0 ? { $and: conditions } : {};

        if (!page && !limit) {
            const purchaseOrders = await PurchaseOrder.find(query).sort({ createdAt: -1 });
            return res.status(200).json(purchaseOrders);
        }

        const currentPage = parseInt(page) || 1;
        const currentLimit = parseInt(limit) || 10;
        const skip = (currentPage - 1) * currentLimit;

        const [purchaseOrders, total] = await Promise.all([
            PurchaseOrder.find(query).sort({ createdAt: -1 }).skip(skip).limit(currentLimit),
            PurchaseOrder.countDocuments(query)
        ]);

        res.status(200).json({
            purchaseOrders,
            total,
            page: currentPage,
            pages: Math.ceil(total / currentLimit)
        });

    } catch (error) {
        console.error("Get Purchase Orders Error:", error);
        res.status(500).json({ message: "Failed to fetch purchase invoices", error: error.message });
    }
};

// GET Single Purchase Invoice
const getPurchaseOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const purchaseOrder = await PurchaseOrder.findById(id).populate('companyId');
        if (!purchaseOrder) return res.status(404).json({ message: "Purchase invoice not found" });

        // Permission Check
        const poCompanyId = purchaseOrder.companyId._id ? purchaseOrder.companyId._id.toString() : purchaseOrder.companyId.toString();
        if (req.user.role !== 'SUPER_ADMIN' && poCompanyId !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        res.status(200).json(purchaseOrder);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch purchase invoice", error: error.message });
    }
};

// UPDATE Purchase Invoice
const updatePurchaseOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const purchaseOrder = await PurchaseOrder.findById(id).populate('companyId');
        if (!purchaseOrder) return res.status(404).json({ message: "Purchase invoice not found" });

        // Permission Check
        if (req.user.role !== 'SUPER_ADMIN' && purchaseOrder.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        // 1. Revert Old Stock Effect
        await revertStockEffect(purchaseOrder);

        // 2. Update PurchaseOrder document
        const updatedPurchaseOrder = await PurchaseOrder.findByIdAndUpdate(
            id,
            { ...req.body },
            { new: true }
        );

        // 3. Apply New Stock Effect
        await applyStockEffect(updatedPurchaseOrder, req.user);

        res.status(200).json({ message: "Purchase invoice updated successfully", purchaseOrder: updatedPurchaseOrder });

    } catch (error) {
        console.error("Update Purchase Order Error:", error);
        res.status(500).json({ message: "Failed to update purchase invoice", error: error.message });
    }
};

// DELETE Purchase Invoice
const deletePurchaseOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const purchaseOrder = await PurchaseOrder.findById(id).populate('companyId');
        if (!purchaseOrder) return res.status(404).json({ message: "Purchase invoice not found" });

        // Permission Check
        if (req.user.role !== 'SUPER_ADMIN' && purchaseOrder.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        // 1. Revert Stock Effect
        await revertStockEffect(purchaseOrder);

        // 2. Delete PO
        await PurchaseOrder.findByIdAndDelete(id);
        res.status(200).json({ message: "Purchase invoice deleted successfully" });

    } catch (error) {
        console.error("Delete Purchase Order Error:", error);
        res.status(500).json({ message: "Failed to delete purchase invoice", error: error.message });
    }
};

module.exports = {
    createPurchaseOrder,
    getPurchaseOrders,
    getPurchaseOrderById,
    updatePurchaseOrder,
    deletePurchaseOrder
};

