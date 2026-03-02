// Refactored analytics.js to match top-level /api/analytics
const express = require('express');
const router = express.Router();
const AdsController = require('../controllers/adsController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

/**
 * Maps to API Documentation:
 * GET /api/analytics/overview
 * GET /api/analytics/performance
 * GET /api/analytics/platforms
 * GET /api/analytics/compare
 * POST /api/analytics/export
 * GET /api/analytics/ga4
 */

// If AdsController already has these generically implemented (not tied to /ads/:platform/...), route them directly.
// In the current codebase, they are in AdsController but expect req.user bindings or query params.

router.get('/overview', AdsController.getAnalyticsOverviewGeneric);

router.get('/performance', AdsController.getAnalyticsPerformanceGeneric);

router.get('/platforms', AdsController.getAnalyticsPlatformsGeneric);

router.get('/compare', AdsController.getAnalyticsCompareGeneric);

router.post('/export', AdsController.exportAnalyticsGeneric);

router.get('/ga4', AdsController.getAnalyticsGA4Generic);

module.exports = router;
