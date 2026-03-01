const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Audit Logs
 *   description: System and team action audit trails
 */

// Apply authentication to all audit routes
router.use(authenticateToken);

/**
 * @swagger
 * /audit-logs:
 *   get:
 *     summary: Get team audit logs
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of audit logs
 */
router.get('/', auditController.getAuditLogs);

module.exports = router;
