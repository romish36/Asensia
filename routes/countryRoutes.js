const express = require('express');
const router = express.Router();
const { getCountries, createCountry } = require('../controllers/countryController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, getCountries);
router.post('/', authMiddleware, createCountry);

module.exports = router;
