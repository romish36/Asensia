const express = require('express');
const router = express.Router();
const { getStates, createState } = require('../controllers/stateController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, getStates);
router.post('/', authMiddleware, createState);

module.exports = router;
