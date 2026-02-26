const Category = require("../models/categoryModel");
const Product = require("../models/productModel");
const InStock = require("../models/inStockModel");

// GET /api/category
const getCategories = async (req, res) => {
    try {
        const query = {};
        const { search, companyId, page, limit } = req.query;

        if (req.user.role === 'SUPER_ADMIN') {
            if (companyId) {
                query.companyId = companyId;
            }
        } else {
            query.companyId = req.user.companyId;
        }

        if (search) {
            query.categoryName = { $regex: search, $options: 'i' };
        }

        if (!page && !limit) {
            const categories = await Category.find(query)
                .populate('companyId', 'companyName name userEmail')
                .sort({ categoryId: 1 });
            return res.status(200).json(categories);
        }

        const currentPage = parseInt(page) || 1;
        const currentLimit = parseInt(limit) || 10;
        const skip = (currentPage - 1) * currentLimit;

        const [categories, total] = await Promise.all([
            Category.find(query)
                .populate('companyId', 'companyName name userEmail')
                .sort({ categoryId: 1 })
                .skip(skip)
                .limit(currentLimit),
            Category.countDocuments(query)
        ]);

        res.status(200).json({
            categories,
            total,
            page: currentPage,
            pages: Math.ceil(total / currentLimit)
        });
    } catch (error) {
        console.error("Get Categories Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// POST /api/category
const createCategory = async (req, res) => {
    try {
        const { categoryName, companyId } = req.body;

        let finalCompanyId;
        if (req.user.role === 'SUPER_ADMIN') {
            if (!companyId) return res.status(400).json({ message: "Company ID is required for Super Admin" });
            finalCompanyId = companyId;
        } else {
            finalCompanyId = req.user.companyId;
        }

        // Check for duplicate name
        const existingCategory = await Category.findOne({
            categoryName: { $regex: new RegExp(`^${categoryName}$`, 'i') }, // Case insensitive check
            companyId: finalCompanyId
        });
        if (existingCategory) {
            return res.status(400).json({ message: "Category with this name already exists" });
        }

        // Auto-increment categoryId
        const lastCategory = await Category.findOne().sort({ categoryId: -1 });
        const categoryId = lastCategory && lastCategory.categoryId ? lastCategory.categoryId + 1 : 1;

        const newCategory = new Category({
            categoryId,
            categoryName,
            companyId: finalCompanyId,
            createdBy: req.user._id
        });

        const savedCategory = await newCategory.save();
        res.status(201).json(savedCategory);

    } catch (error) {
        console.error("Create Category Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// PUT /api/category/:id
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { categoryName } = req.body;

        const category = await Category.findById(id);
        if (!category) return res.status(404).json({ message: "Category not found" });

        // Check for duplicate name if name is changing
        if (categoryName && categoryName.toLowerCase() !== category.categoryName.toLowerCase()) {
            const existingCategory = await Category.findOne({
                categoryName: { $regex: new RegExp(`^${categoryName}$`, 'i') },
                companyId: category.companyId,
                _id: { $ne: id }
            });
            if (existingCategory) {
                return res.status(400).json({ message: "Category with this name already exists" });
            }
        }

        // Update
        category.categoryName = categoryName || category.categoryName;
        const updatedCategory = await category.save();

        res.status(200).json(updatedCategory);

    } catch (error) {
        console.error("Update Category Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// DELETE /api/category/:id
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { force } = req.query;

        const category = await Category.findById(id);

        if (!category) return res.status(404).json({ message: "Category not found" });

        // Check Permissions
        if (req.user.role !== 'SUPER_ADMIN' && category.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Check for associated Products
        const productCount = await Product.countDocuments({ categoryId: id });

        if (productCount > 0 && force !== 'true') {
            return res.status(409).json({
                code: 'PRODUCT_EXISTS',
                message: "This category product is available in product page if still you delete then product page delete this category product"
            });
        }

        // Force Delete or No Products
        if (productCount > 0) {
            // 1. Find products to clean up their InStock history
            const products = await Product.find({ categoryId: id });
            const productIds = products.map(p => p.productId); // Assuming InStock links via numeric productId

            // 2. Delete InStock records for these products
            await InStock.deleteMany({ productId: { $in: productIds }, companyId: category.companyId });

            // 3. Delete Products
            await Product.deleteMany({ categoryId: id });
        }

        // 4. Delete Category
        await Category.findByIdAndDelete(id);
        res.status(200).json({ message: "Category and all associated products deleted successfully" });

    } catch (error) {
        console.error("Delete Category Error:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory
};
