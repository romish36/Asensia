const Product = require("../models/productModel");
const InStock = require("../models/inStockModel");
const Company = require("../models/companyModel"); // Ensure registration

// GET ALL PRODUCTS (Company-scoped)
// GET /api/products
// The companyScopeMiddleware automatically filters by companyId
// SUPER_ADMIN sees all products, other users see only their company's products
const getProducts = async (req, res) => {
    try {
        const query = {};
        const { search, companyId, page, limit } = req.query;

        // Allow SUPER_ADMIN to filter by companyId via query param
        if (req.user.role === 'SUPER_ADMIN' && companyId) {
            query.companyId = companyId;
        }

        if (req.query.categoryId) {
            query.categoryId = req.query.categoryId;
        }

        if (search) {
            const Category = require("../models/categoryModel");
            const categories = await Category.find({
                categoryName: { $regex: search, $options: 'i' },
                ...(req.user.role !== 'SUPER_ADMIN' ? { companyId: req.user.companyId } : (companyId ? { companyId } : {}))
            }).select('_id');
            const categoryIds = categories.map(c => c._id);

            query.$or = [
                { productName: { $regex: search, $options: 'i' } },
                { productGrade: { $regex: search, $options: 'i' } },
                { productModelNumber: { $regex: search, $options: 'i' } },
                { productDesignName: { $regex: search, $options: 'i' } },
                { sizeName: { $regex: search, $options: 'i' } },
                { categoryId: { $in: categoryIds } }
            ];
        }

        // BACKWARD COMPATIBILITY: If no page/limit provided, return all as plain array
        if (!page && !limit) {
            const products = await Product.find(query)
                .sort({ createdAt: -1 })
                .populate({ path: 'companyId', select: 'companyName name email', model: 'Company' })
                .populate({ path: 'categoryId', select: 'categoryName', model: 'Category' });
            return res.status(200).json(products);
        }

        // PAGINATED RESPONSE
        const currentPage = parseInt(page) || 1;
        const currentLimit = parseInt(limit) || 10;
        const skip = (currentPage - 1) * currentLimit;

        const [products, total] = await Promise.all([
            Product.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(currentLimit)
                .populate({ path: 'companyId', select: 'companyName name email', model: 'Company' })
                .populate({ path: 'categoryId', select: 'categoryName', model: 'Category' }),
            Product.countDocuments(query)
        ]);

        res.status(200).json({
            products,
            total,
            page: currentPage,
            pages: Math.ceil(total / currentLimit)
        });
    } catch (error) {
        console.error("Get Products Error:", error);
        res.status(500).json({
            message: "Failed to fetch products",
            error: error.message,
        });
    }
};

// CREATE PRODUCT
// POST /api/product
const createProduct = async (req, res) => {
    try {


        const {
            sizeId, sizeName, productName,
            productHsnCode, productModelNumber, productDesignName,
            productFinshGlaze, productSalePrice, productStock,
            productImage, stockType, productType,
            companyId, categoryId, // Added categoryId 
            ...otherFields
        } = req.body;

        let finalCompanyId;

        // CASE 1: SUPER_ADMIN must select company
        if (req.user.role === 'SUPER_ADMIN') {
            if (!companyId) {
                return res.status(400).json({ message: "Super Admin must select a company." });
            }
            finalCompanyId = companyId;
        } else {
            // CASE 2: Company Admin/User -> Auto-assign their company
            finalCompanyId = req.user.companyId;
            if (!finalCompanyId) {
                return res.status(400).json({ message: "User is not associated with any company." });
            }
        }

        // Validate Category
        if (!categoryId) {
            return res.status(400).json({ message: "Category ID is required" });
        }

        // Auto-generate productId
        const lastProduct = await Product.findOne().sort({ productId: -1 });
        const nextProductId = lastProduct && lastProduct.productId ? lastProduct.productId + 1 : 1;

        const newProduct = new Product({
            productId: nextProductId,
            sizeId: sizeId ? Number(sizeId) : 0,
            categoryId, // Add Category ID
            sizeName: sizeName || '-',
            productName,
            productHsnCode,
            productModelNumber,
            productDesignName,
            productFinshGlaze,
            productSalePrice: productSalePrice ? String(productSalePrice) : "0",
            productStock: Number(productStock) || 0,
            productImages: productImage,
            stockType: Number(stockType) || 0,
            productType: Number(productType) || 0,

            // System fields
            companyId: finalCompanyId,
            createdBy: req.user._id,

            // Insert current date/time strings if needed
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),

            ...otherFields
        });

        const savedProduct = await newProduct.save();

        // Auto-create InStock record if initial stock > 0
        if (savedProduct.productStock > 0) {
            try {
                const lastInStock = await InStock.findOne().sort({ inStockId: -1 });
                const nextInId = lastInStock && lastInStock.inStockId ? lastInStock.inStockId + 1 : 1;

                const newStock = new InStock({
                    inStockId: nextInId,
                    purchaseOrderId: 0,
                    purchaseOrderMetaId: 0,
                    productId: savedProduct.productId,
                    productName: savedProduct.productName,
                    inQuantity: String(savedProduct.productStock),
                    inPrice: savedProduct.productSalePrice || "0", // Assuming sale price as initial value
                    totalAmount: String((Number(savedProduct.productStock) * Number(savedProduct.productSalePrice || 0)).toFixed(2)),
                    date: new Date().toISOString().split('T')[0],
                    invoiceNo: "OPENING_STOCK",
                    companyId: finalCompanyId,
                    createdBy: req.user._id
                });
                await newStock.save();

            } catch (stockErr) {
                console.error("Failed to auto-create InStock record:", stockErr);
                // Don't fail the product creation, just log error
            }
        }

        res.status(201).json(savedProduct);

    } catch (error) {
        console.error("Create Product Error:", error);
        res.status(500).json({
            message: "Failed to create product",
            error: error.message
        });
    }
};

// UPDATE PRODUCT
// PUT /api/product/:id
// Case 1: Super Admin can change companyId (move product)
// Case 2: Company Admin can only edit details, cannot change company
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Check Permissions
        if (req.user.role !== 'SUPER_ADMIN') {
            const userCompanyId = req.user.companyId?.toString();
            const productCompanyId = product.companyId?.toString();

            if (!userCompanyId || userCompanyId !== productCompanyId) {
                return res.status(403).json({ message: "Access denied: Cannot edit product of another company" });
            }
        }

        // Prepare Update Data
        let updateData = { ...req.body };

        // Ensure types
        if (updateData.productStock !== undefined) updateData.productStock = Number(updateData.productStock);
        if (updateData.stockType !== undefined) updateData.stockType = Number(updateData.stockType);
        if (updateData.productType !== undefined) updateData.productType = Number(updateData.productType);
        if (updateData.sizeId !== undefined) {
            updateData.sizeId = updateData.sizeId === '' ? 0 : Number(updateData.sizeId);
        }

        // Ensure categoryId is passed if updated
        if (updateData.categoryId) updateData.categoryId = updateData.categoryId;

        // Map productImage to productImages if provided
        if (updateData.productImage) {
            updateData.productImages = updateData.productImage;
            delete updateData.productImage;
        }

        // Handle Company Move (Case 1 vs Case 2)
        if (req.user.role !== 'SUPER_ADMIN') {
            delete updateData.companyId;
        }

        const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true });
        res.status(200).json(updatedProduct);

    } catch (error) {
        console.error("Update Product Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { force } = req.query; // Check if force delete is requested

        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Permission Check
        if (req.user.role !== 'SUPER_ADMIN') {
            const userCompanyId = req.user.companyId?.toString();
            const productCompanyId = product.companyId?.toString();

            if (!userCompanyId || userCompanyId !== productCompanyId) {
                return res.status(403).json({ message: "Access denied: Cannot delete product of another company" });
            }
        }

        // Check for associated InStock records
        const stockCount = await InStock.countDocuments({ productId: product.productId, companyId: product.companyId });

        if (stockCount > 0 && force !== 'true') {
            return res.status(409).json({
                code: 'STOCK_EXISTS',
                message: "This product stock is available in instock page. If you still want to delete, it will remove all stock history."
            });
        }

        // If force is true or no stock exists, proceed to delete
        // 1. Delete associated InStock records
        if (stockCount > 0) {
            await InStock.deleteMany({ productId: product.productId, companyId: product.companyId });
        }

        // 2. Delete the Product
        await Product.findByIdAndDelete(id);

        res.status(200).json({ message: "Product and associated stock history deleted successfully" });

    } catch (error) {
        console.error("Delete Product Error:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getProducts, createProduct, updateProduct, deleteProduct };
