const express = require('express');
const router = express.Router();
const inboxController = require('../controllers/inboxController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Inbox
 *   description: User messages and replies
 */

router.use(authenticateToken);

/**
 * @swagger
 * /inbox/messages:
 *   get:
 *     summary: Retrieve inbox messages
 *     tags: [Inbox]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of messages
 */
router.get('/messages', inboxController.getMessages);

/**
 * @swagger
 * /inbox/messages/{id}/reply:
 *   post:
 *     summary: Reply to an inbox message
 *     tags: [Inbox]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Reply sent successfully
 */
router.post('/messages/:id/reply', inboxController.replyToMessage);

/**
 * @swagger
 * /inbox/messages/{id}/suggest-reply:
 *   post:
 *     summary: Generate an AI reply suggestion for a message
 *     tags: [Inbox]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               teamId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Suggestion generated successfully
 */
router.post('/messages/:id/suggest-reply', inboxController.suggestReply);
router.post('/messages/:id/moderate', inboxController.moderateMessage);
router.post('/messages/seed', inboxController.seedMessage);

module.exports = router;
