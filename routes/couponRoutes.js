const express = require('express');
const router = express.Router();
const {
    getAllCoupons,
    getCouponById,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    validateCoupon
} = require('../controllers/couponController');
const protect = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/validate', validateCoupon);
router.route('/')
    .get(getAllCoupons)
    .post(createCoupon);

router.route('/:id')
    .get(getCouponById)
    .put(updateCoupon)
    .delete(deleteCoupon);

module.exports = router;
