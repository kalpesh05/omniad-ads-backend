// routes/adsAuthRoutes.js
const express = require('express');
const router = express.Router();
const AdsAuthController = require('../controllers/adsAuthController');
// const requireAuth = require('../middleware/requireAuth');
const { authenticateToken } = require('../middleware/auth');


router.use(authenticateToken);

/**
 * @swagger
 * /api/ads-auth/auth-url/case/{authCase}:
 *   get:
 *     summary: Generate authentication URLs for a specific case
 *     tags: [Ads Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: authCase
 *         required: true
 *         schema:
 *           type: string
 *         description: The authentication case identifier
 *     responses:
 *       200:
 *         description: Auth URL(s) generated
 */
router.get('/auth-url/case/:authCase', AdsAuthController.generateAuthUrls);

/**
 * @swagger
 * /api/ads-auth/auth-url/platform/{platform}:
 *   get:
 *     summary: Generate authentication URL for a specific platform
 *     tags: [Ads Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *         description: The platform name (e.g., google, facebook)
 *     responses:
 *       200:
 *         description: Platform auth URL generated
 */
router.get('/auth-url/platform/:platform', AdsAuthController.generatePlatformAuthUrl);

/**
 * @swagger
 * /api/ads-auth/callback/{platform}:
 *   get:
 *     summary: Handle OAuth callback for a platform
 *     tags: [Ads Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *         description: The platform name
 *     responses:
 *       200:
 *         description: OAuth callback handled
 */
router.get('/callback/:platform', AdsAuthController.handleOAuthCallback);

/**
 * @swagger
 * /api/ads-auth/auth-status/case/{authCase}:
 *   get:
 *     summary: Check authentication status for a specific case
 *     tags: [Ads Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: authCase
 *         required: true
 *         schema:
 *           type: string
 *         description: The authentication case identifier
 *     responses:
 *       200:
 *         description: Auth status returned
 */
router.get('/auth-status/case/:authCase', AdsAuthController.checkAuthStatus);

/**
 * @swagger
 * /api/ads-auth/auth-status/full:
 *   get:
 *     summary: Get full authentication status for all platforms/cases
 *     tags: [Ads Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Full auth status returned
 */
router.get('/auth-status/full', AdsAuthController.getFullAuthStatus);

/**
 * @swagger
 * /api/ads-auth/refresh-tokens:
 *   post:
 *     summary: Refresh tokens for ads platforms
 *     tags: [Ads Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               platform:
 *                 type: string
 *                 description: The platform to refresh tokens for
 *     responses:
 *       200:
 *         description: Tokens refreshed
 */
router.post('/refresh-tokens', AdsAuthController.refreshTokens);

module.exports = router;
