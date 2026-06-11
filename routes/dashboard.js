const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/ads/analyticsController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/overview', AnalyticsController.getDashboardOverviewGeneric);

module.exports = router;
