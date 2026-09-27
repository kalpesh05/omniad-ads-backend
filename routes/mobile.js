const express = require('express');
const router = express.Router();
const mobileController = require('../controllers/mobileController');
const { authenticateToken } = require('../middleware/auth');

// All mobile endpoints require authenticated JWT
router.use(authenticateToken);

/**
 * @route   GET /api/mobile/executive-summary
 * @desc    Fetch high-level ROAS, daily spend vs cap, active campaigns, and urgent action items for Pocket CEO
 * @access  Private
 */
router.get('/executive-summary', mobileController.getExecutiveSummary);

/**
 * @route   GET /api/mobile/feed
 * @desc    Fetch chronological stream of agency events (approvals, payments, alerts)
 * @access  Private
 */
router.get('/feed', mobileController.getFeed);

/**
 * @route   POST /api/mobile/register-push-token
 * @desc    Register Expo / APNs / FCM push token for mobile alerts
 * @access  Private
 */
router.post('/register-push-token', mobileController.registerPushToken);

/**
 * @route   POST /api/mobile/quick-action
 * @desc    Execute fast CEO actions (pause/resume campaign, remind client, dismiss alert)
 * @access  Private
 */
router.post('/quick-action', mobileController.quickAction);

module.exports = router;
