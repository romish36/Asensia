const UserPermissions = require('../models/userPermissionModel');

/**
 * Middleware to check user permissions for a specific module and action.
 * @param {string} moduleName - The name of the module (e.g., 'Product', 'Invoice')
 * @param {string} action - The action to check (e.g., 'add', 'update', 'delete', 'view')
 */
const checkPermission = (moduleName, action) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'Authentication required.' });
            }

            // SUPER_ADMIN has all permissions by default
            if (req.user.role === 'SUPER_ADMIN') {
                console.log(`[Permission] GRANTED: SUPER_ADMIN bypass for ${moduleName}:${action}`);
                return next();
            }

            // Support both numeric userId (preferred) and Mongo _id as fallback
            const userId = req.user.userId || req.user._id;

            if (!userId) {
                console.error("[Permission] Critical: User found in request but has no ID.", req.user);
                return res.status(401).json({ message: 'User ID missing in session.' });
            }

            // Fetch permissions from DB
            // We try both formats if numeric userId is used
            const query = typeof userId === 'number' ? { userId } : { mongoUserId: userId };
            let userPerms = await UserPermissions.findOne({ userId: Number(userId) });

            if (!userPerms) {
                console.warn(`[Permission] DENIED: No permissions document found for user: ${userId} (${req.user.userEmail})`);
                return res.status(403).json({
                    message: `Access Denied. No permissions configured for your account.`,
                    code: 'NO_PERMISSIONS_CONFIGURED',
                    module: moduleName,
                    action: action
                });
            }

            const permissionsMap = userPerms.permissions;
            if (!permissionsMap) {
                console.error(`[Permission] ERROR: Permissions map is missing for user: ${userId}`);
                return res.status(500).json({ message: "Permissions structure is corrupted on server." });
            }

            // Get module permissions
            const modulePermissions = permissionsMap.get(moduleName);

            if (!modulePermissions || modulePermissions[action] !== 1) {
                console.warn(`[Permission] DENIED: User ${userId} requested ${action} on ${moduleName}`);
                return res.status(403).json({
                    message: `Permission Denied: You do not have '${action}' access for the '${moduleName}' module.`,
                    code: 'PERMISSION_DENIED',
                    required: { module: moduleName, action: action }
                });
            }

            console.log(`[Permission] GRANTED: User ${userId} -> ${moduleName}:${action}`);
            next();
        } catch (error) {
            console.error('Permission Middleware Error:', error);
            res.status(500).json({ message: 'Internal Server Error during permission check.' });
        }
    };
};

module.exports = checkPermission;
