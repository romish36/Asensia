const BundleItem = require("../models/bundleItemModel");
const Product = require("../models/productModel");

// GET Bundle Items by Bundle Product ID
// GET /api/bundle/:productBundleId
const getBundleItems = async (req, res) => {
    try {
        const { productBundleId } = req.params;

        // 1. Get all bundle items for this bundle product
        const bundleItems = await BundleItem.find({ productBundleId: Number(productBundleId) });

        if (!bundleItems.length) {
            return res.status(200).json([]);
        }

        // 2. Extract productIds
        const productIds = bundleItems.map(item => item.productId);

        // 3. Fetch product details for these IDs
        const products = await Product.find({ productId: { $in: productIds } });

        // 4. Map back to include bundleItemId for deletion
        const result = bundleItems.map(item => {
            const product = products.find(p => p.productId === item.productId);
            return {
                _id: item._id, // bundle item ID (for deletion)
                bundleItemId: item.bundleItemId,
                productBundleId: item.productBundleId,
                productId: item.productId,
                productDetails: product || null // content of the product
            };
        });

        res.status(200).json(result);

    } catch (error) {
        console.error("Get Bundle Items Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ADD Items to Bundle
// POST /api/bundle/add
const addBundleItems = async (req, res) => {
    try {
        const { productBundleId, productIds } = req.body; // productIds is array of Numbers

        if (!productBundleId || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ message: "Invalid data. productBundleId and productIds array required" });
        }

        const newItems = [];
        const date = new Date().toLocaleDateString();
        const time = new Date().toLocaleTimeString();

        // Get last bundleItemId for auto-increment
        const lastItem = await BundleItem.findOne().sort({ bundleItemId: -1 });
        let nextId = lastItem && lastItem.bundleItemId ? lastItem.bundleItemId + 1 : 1;

        for (const pid of productIds) {
            // Check if already exists
            const exists = await BundleItem.findOne({ productBundleId: Number(productBundleId), productId: Number(pid) });
            if (!exists) {
                newItems.push({
                    bundleItemId: nextId++,
                    productBundleId: Number(productBundleId),
                    productId: Number(pid),
                    date,
                    time
                });
            }
        }

        if (newItems.length > 0) {
            await BundleItem.insertMany(newItems);
            res.status(201).json({ message: "Items added to bundle successfully", count: newItems.length });
        } else {
            res.status(200).json({ message: "No new items to add (duplicates skipped)" });
        }

    } catch (error) {
        console.error("Add Bundle Items Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// DELETE Bundle Item
// DELETE /api/bundle/:id
const deleteBundleItem = async (req, res) => {
    try {
        const { id } = req.params; // _id of the bundleItem document
        await BundleItem.findByIdAndDelete(id);
        res.status(200).json({ message: "Bundle item deleted successfully" });
    } catch (error) {
        console.error("Delete Bundle Item Error:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getBundleItems,
    addBundleItems,
    deleteBundleItem
};
