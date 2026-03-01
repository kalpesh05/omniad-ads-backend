const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: Team settings management
 */

router.use(authenticateToken);

/**
 * @swagger
 * /settings:
 *   get:
 *     summary: Get team settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *         description: Team ID
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
 *       404:
 *         description: Settings not found
 */

router.get('/', settingsController.getSettings);
/**
 * @swagger
 * /settings:
 *   put:
 *     summary: Update team settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               teamId:
 *                 type: string
 *               timezone:
 *                 type: string
 *               notification_preferences:
 *                 type: object
 *               auto_publish:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.put('/', settingsController.updateSettings);

module.exports = router;
