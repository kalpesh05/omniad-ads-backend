const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: AI Services
 *   description: Generative AI for Ad Copy and Insights
 */

router.use(authenticateToken);

/**
 * @swagger
 * /ai/generate-copy:
 *   post:
 *     summary: Generate Ad Copy variations using AI
 *     tags: [AI Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               topic:
 *                 type: string
 *                 example: "eco-friendly running shoes"
 *               targetAudience:
 *                 type: string
 *                 example: "marathon runners aged 25-40"
 *               platform:
 *                 type: string
 *                 example: "Facebook"
 *               provider:
 *                 type: string
 *                 enum: [openai, anthropic, gemini]
 *                 example: "openai"
 *     responses:
 *       200:
 *         description: AI Drafts Generated successfully
 */
router.post('/generate-copy', aiController.generateCopy);

/**
 * @swagger
 * /ai/insights:
 *   post:
 *     summary: Analyze tracking metrics and return actionable insights
 *     tags: [AI Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               metricsSummary:
 *                 type: object
 *               provider:
 *                 type: string
 *                 enum: [openai, anthropic, gemini]
 *                 example: "anthropic"
 *     responses:
 *       200:
 *         description: Actionable insights analyzed
 */
router.post('/insights', aiController.generateInsights);
router.get('/insights', aiController.getInsightsOverview);

/**
 * @swagger
 * /ai/optimize-budget:
 *   post:
 *     summary: Get AI budget reallocation recommendations
 *     tags: [AI Services]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Budget optimized
 */
router.post('/optimize-budget', aiController.optimizeBudget);

/**
 * @swagger
 * /ai/anomalies:
 *   get:
 *     summary: Detect unusual performance changes
 *     tags: [AI Services]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Anomalies detected
 */
router.get('/anomalies', aiController.getAnomalies);

// Preserve legacy chat for broader system compatibility
const AnalyticsController = require('../controllers/ads/analyticsController');
router.post('/chat', AnalyticsController.aiChat);

module.exports = router;
