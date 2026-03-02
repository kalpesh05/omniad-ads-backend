const express = require('express');
const router = express.Router();
const AdsController = require('../controllers/adsController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/overview', AdsController.getDashboardOverviewGeneric);

module.exports = router;
