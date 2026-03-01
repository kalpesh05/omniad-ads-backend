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

router.get('/overview', AdsController.getAnalyticsMetrics ? AdsController.getAnalyticsMetrics : async (req, res) => {
    res.status(501).json({ success: false, message: 'Generic analytics overview pending' });
});

router.get('/performance', async (req, res) => {
    res.status(501).json({ success: false, message: 'Generic analytics performance pending' });
});

router.get('/platforms', async (req, res) => {
    res.status(501).json({ success: false, message: 'Generic analytics platforms breakdown pending' });
});

router.get('/compare', async (req, res) => {
    res.status(501).json({ success: false, message: 'Generic analytics comparison pending' });
});

router.post('/export', async (req, res) => {
    res.status(501).json({ success: false, message: 'Generic analytics export pending' });
});

router.get('/ga4', async (req, res) => {
    res.status(501).json({ success: false, message: 'GA4 analytics pending' });
});

module.exports = router;
