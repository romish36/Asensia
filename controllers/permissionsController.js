const Permissions = require("../models/permissionsModel");

// GET /api/permissions
const getPermissions = async (req, res) => {
    try {
        const permissions = await Permissions.find().sort({ permissionsId: 1 });
        res.status(200).json(permissions);
    } catch (error) {
        console.error("Get Permissions Error:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getPermissions
};
