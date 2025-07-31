// routes/adsAuthRoutes.js
const express = require('express');
const router = express.Router();
const AdsAuthController = require('../controllers/adsAuthController');
const requireAuth = require('../middleware/requireAuth');

router.use(requireAuth);

router.get('/auth-url/case/:authCase', AdsAuthController.generateAuthUrls);
router.get('/auth-url/platform/:platform', AdsAuthController.generatePlatformAuthUrl);
router.get('/callback/:platform', AdsAuthController.handleOAuthCallback);
router.get('/auth-status/case/:authCase', AdsAuthController.checkAuthStatus);
router.get('/auth-status/full', AdsAuthController.getFullAuthStatus);
router.post('/refresh-tokens', AdsAuthController.refreshTokens);

module.exports = router;
