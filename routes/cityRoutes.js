const express = require('express');
const router = express.Router();
const { getCities, createCity } = require('../controllers/cityController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, getCities);
router.post('/', authMiddleware, createCity);

module.exports = router;
