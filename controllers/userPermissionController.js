const UserPermissions = require('../models/userPermissionModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');

// Helper to get numeric userId regardless of whether numeric ID or ObjectId string is passed
const resolveUserId = async (id) => {
    console.log(`Resolving ID: ${id} (Type: ${typeof id})`);

    // 1. Try as direct number
    if (!isNaN(Number(id)) && String(id).length < 15) {
        return Number(id);
    }

    // 2. Try as MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
        const user = await User.findById(id);
        if (user && user.userId) {
            console.log(`Resolved ObjectId ${id} to numeric userId ${user.userId}`);
            return user.userId;
        }
    }

    // 3. Last ditch: check if it's a numeric string in a large format or something else
    // But usually the above two cover everything.
    return null;
};

/**
 * @desc    Save or Update User Permissions
 * @route   POST /api/user-permissions/save
 * @access  Private (Admin/SuperAdmin only)
 */
const saveUserPermissions = async (req, res) => {
    try {
        let { userId, permissions } = req.body;
        console.log("Saving permissions for ID:", userId);

        const numericUserId = await resolveUserId(userId);

        if (!numericUserId) {
            console.error("Could not resolve numeric userId for:", userId);
            return res.status(400).json({ message: "Invalid user ID format or user not found" });
        }

        // Upsert permissions using numeric userId
        const updatedPerms = await UserPermissions.findOneAndUpdate(
            { userId: numericUserId },
            {
                userId: numericUserId,
                permissions: permissions || {}
            },
            { new: true, upsert: true }
        );

        res.status(200).json({
            message: "Permissions saved successfully",
            data: updatedPerms
        });
    } catch (error) {
        console.error("Save Permissions Error:", error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get Permissions for a specific user
 * @route   GET /api/user-permissions/:userId
 * @access  Private
 */
const getUserPermissions = async (req, res) => {
    try {
        const { userId: rawId } = req.params;
        console.log("Fetching permissions for ID:", rawId);

        const numericUserId = await resolveUserId(rawId);

        if (!numericUserId) {
            console.error("Could not resolve numeric userId for fetch:", rawId);
            return res.status(400).json({ message: "Invalid user ID format" });
        }

        const permissions = await UserPermissions.findOne({ userId: numericUserId });

        if (!permissions) {
            return res.status(200).json({
                userId: numericUserId,
                permissions: {} // Return empty map if none set
            });
        }

        res.status(200).json(permissions);
    } catch (error) {
        console.error("Get Permissions Error:", error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get a list of all system modules and actions for UI building
 * @route   GET /api/user-permissions/metadata
 * @access  Private
 */
const getPermissionMetadata = async (req, res) => {
    const modules = [
        "Purchase Order", "Invoice", "InStock", "OutStock",
        "Seller", "Customer", "Transporter", "Product",
        "Category", "Expense", "User", "Grade",
        "CustomerType", "InvoiceName", "PaymentMode",
        "SaleType", "Color", "ExpensePurpose"
    ];

    const actions = [
        "add", "update", "delete", "view",
        "status", "report", "showAll", "showDetails"
    ];

    res.status(200).json({ modules, actions });
};

module.exports = {
    saveUserPermissions,
    getUserPermissions,
    getPermissionMetadata
};
