const express = require('express');
const AdsController = require('../controllers/adsController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     summary: AI chat endpoint
 *     tags: [AI Features]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *               context:
 *                 type: object
 *     responses:
 *       200:
 *         description: AI chat response generated successfully
 */
router.post('/chat', authenticateToken, AdsController.aiChat);

/**
 * @swagger
 * /api/ai/insights:
 *   post:
 *     summary: Get AI-generated insights
 *     tags: [AI Features]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - propertyId
 *             properties:
 *               propertyId:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               dateRange:
 *                 type: string
 *     responses:
 *       200:
 *         description: AI insights retrieved successfully
 */
router.post('/insights', authenticateToken, AdsController.aiInsights);

/**
 * @swagger
 * /api/ai/recommendations:
 *   post:
 *     summary: Get AI recommendations
 *     tags: [AI Features]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - propertyId
 *             properties:
 *               propertyId:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               dateRange:
 *                 type: string
 *     responses:
 *       200:
 *         description: AI recommendations retrieved successfully
 */
router.post('/recommendations', authenticateToken, AdsController.aiRecommendations);

module.exports = router;

