const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brandController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Brand Guidelines
 *   description: AI Brand Guidelines and Custom FAQ rules
 */

/**
 * @swagger
 * /brand/{teamId}:
 *   get:
 *     summary: Retrieve brand guidelines for a team
 *     tags: [Brand Guidelines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Brand guidelines retrieved successfully
 */
router.get('/:teamId', brandController.getBrandGuidelines);

/**
 * @swagger
 * /brand/{teamId}:
 *   post:
 *     summary: Create or update brand guidelines for a team
 *     tags: [Brand Guidelines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - brandName
 *               - brandVoice
 *             properties:
 *               brandName:
 *                 type: string
 *               brandVoice:
 *                 type: string
 *               faqRules:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     q:
 *                       type: string
 *                     a:
 *                       type: string
 *     responses:
 *       200:
 *         description: Brand guidelines updated successfully
 */
router.post('/:teamId', brandController.updateBrandGuidelines);

module.exports = router;
