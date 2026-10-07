const express = require('express');
const router = express.Router();
const controller = require('../controllers/aiCreativeController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// Creative Studio & Intelligence Leaderboard
router.get('/', controller.getCreatives);
router.get('/leaderboard', controller.getLeaderboard);
router.post('/diagnose', controller.diagnoseCreative);
router.post('/generate', controller.generateCreative);

// Automated Creative Fatigue Alerts & Slack/Webhook Integration
router.get('/alerts/settings', controller.getAlertSettings);
router.put('/alerts/settings', controller.updateAlertSettings);
router.post('/alerts/test', controller.testAlert);
router.post('/alerts/scan', controller.scanAndDispatchAlerts);
router.post('/alerts/dispatch-single', controller.dispatchSingleAlert);

module.exports = router;
