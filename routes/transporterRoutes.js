const express = require('express');
const router = express.Router();
const transporterController = require('../controllers/transporterController');
const authMiddleware = require('../middlewares/authMiddleware');
const companyScopeMiddleware = require('../middlewares/companyScopeMiddleware');
const Transporter = require('../models/transporterModel');
const checkPermission = require('../middlewares/permissionMiddleware');

router.get('/', authMiddleware, companyScopeMiddleware(Transporter), checkPermission('Transporter', 'view'), transporterController.getTransporters);
// Actually standard is good. Let's use controller logic for filtering as it handles role nuance better sometimes. But middleware is cleaner.
// Re-using same pattern as InStock.

router.get('/:id', authMiddleware, checkPermission('Transporter', 'view'), transporterController.getTransporterById);
router.post('/', authMiddleware, checkPermission('Transporter', 'add'), (req, res, next) => {
    // Inject user company ID if not super admin
    if (req.user.role !== 'SUPER_ADMIN') {
        req.body.companyId = req.user.companyId;
    }
    next();
}, transporterController.createTransporter);

router.put('/:id', authMiddleware, checkPermission('Transporter', 'update'), transporterController.updateTransporter);
router.delete('/:id', authMiddleware, checkPermission('Transporter', 'delete'), transporterController.deleteTransporter);

module.exports = router;
