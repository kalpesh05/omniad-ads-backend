// Refactored analytics.js to match top-level /api/analytics
const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/ads/analyticsController');
const ReportController = require('../controllers/ads/reportController');
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

router.get('/overview', AnalyticsController.getAnalyticsOverviewGeneric);

router.get('/performance', AnalyticsController.getAnalyticsPerformanceGeneric);

router.get('/platforms', AnalyticsController.getAnalyticsPlatformsGeneric);

router.get('/compare', AnalyticsController.getAnalyticsCompareGeneric);

router.post('/export', ReportController.exportAnalyticsGeneric);

router.get('/ga4', AnalyticsController.getAnalyticsGA4Generic);

module.exports = router;
