/**
 * Company Scope Middleware
 * Automatically filters queries by companyId for multi-tenant data isolation
 * SUPER_ADMIN bypasses this filter
 */

const mongoose = require('mongoose');

const companyScopeMiddleware = (Model) => {
    return (req, res, next) => {
        // Store original find methods
        const originalFind = Model.find;
        const originalFindOne = Model.findOne;
        const originalFindById = Model.findById;
        const originalCountDocuments = Model.countDocuments;

        // Get user info from auth middleware (req.user)
        const userRole = req.user?.role;
        const userCompanyId = req.user?.companyId;

        // SUPER_ADMIN bypasses company scope
        if (userRole === 'SUPER_ADMIN') {
            console.log('🔓 SUPER_ADMIN access - Fully access');
            return next();
        }

        // Apply company filter for non-SUPER_ADMIN users
        if (userCompanyId) {
            // Robust filter: match either string ID or ObjectId
            let companyFilter = userCompanyId;
            if (mongoose.Types.ObjectId.isValid(userCompanyId)) {
                companyFilter = { $in: [userCompanyId, new mongoose.Types.ObjectId(userCompanyId)] };
            }

            // Override find method
            Model.find = function (conditions = {}, ...args) {
                if (!conditions.companyId) {
                    conditions.companyId = companyFilter;
                }
                console.log('🔒 Company scope applied:', companyFilter);
                return originalFind.call(this, conditions, ...args);
            };

            // Override findOne method
            Model.findOne = function (conditions = {}, ...args) {
                if (!conditions.companyId) {
                    conditions.companyId = companyFilter;
                }
                return originalFindOne.call(this, conditions, ...args);
            };

            // Override countDocuments method
            Model.countDocuments = function (conditions = {}, ...args) {
                if (!conditions.companyId) {
                    conditions.companyId = companyFilter;
                }
                return originalCountDocuments.call(this, conditions, ...args);
            };

            // Restore original methods after request
            res.on('finish', () => {
                Model.find = originalFind;
                Model.findOne = originalFindOne;
                Model.findById = originalFindById;
                Model.countDocuments = originalCountDocuments;
            });
        } else {
            // User has no companyId (legacy user) - allow but log warning
            console.warn('⚠️ User has no companyId - legacy mode, no company filter applied');
        }

        next();
    };
};

module.exports = companyScopeMiddleware;
