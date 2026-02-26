const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
    getAllPlans,
    getPlanById,
    createPlan,
    updatePlan,
    deletePlan
} = require('../controllers/planController');

router.get('/', authMiddleware, getAllPlans);
router.get('/:id', authMiddleware, getPlanById);
router.post('/', authMiddleware, createPlan);
router.put('/:id', authMiddleware, updatePlan);
router.delete('/:id', authMiddleware, deletePlan);

module.exports = router;
