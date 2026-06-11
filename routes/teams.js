const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const teamController = require('../controllers/teamController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Teams
 *   description: Team, workspace, and member management
 */

// Apply authentication to all team routes
router.use(authenticateToken);

/**
 * @swagger
 * /teams:
 *   get:
 *     summary: Get all teams for current user
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of teams
 *   post:
 *     summary: Create a new team
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *     responses:
 *       201:
 *         description: Team created
 */
router.get('/', teamController.getTeams);

router.post('/', [
    check('name', 'Name is required and must be between 2 to 100 characters').isLength({ min: 2, max: 100 }),
    check('slug', 'Slug must be alphanumeric with hyphens only').optional().matches(/^[a-z0-9-]+$/)
], teamController.createTeam);

/**
 * @swagger
 * /teams/{teamId}/invite:
 *   post:
 *     summary: Invite a new member to a team
 *     tags: [Teams]
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
 *             properties:
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: Member invited
 */
router.post('/:teamId/invite', [
    check('email', 'Please include a valid email').isEmail(),
    check('role', 'Valid role is required').isIn(['admin', 'manager', 'editor', 'viewer'])
], teamController.inviteMember);

/**
 * @swagger
 * /teams/{teamId}/members/{userId}:
 *   put:
 *     summary: Update member role
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *       - in: path
 *         name: userId
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: Role updated
 *   delete:
 *     summary: Remove member from team
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *       - in: path
 *         name: userId
 *         required: true
 *     responses:
 *       200:
 *         description: Member removed
 */
router.put('/:teamId/members/:userId', [
    check('role', 'Valid role is required').isIn(['admin', 'manager', 'editor', 'viewer'])
], teamController.updateMemberRole);

router.delete('/:teamId/members/:userId', teamController.removeMember);

router.get('/:teamId/members', teamController.getTeamMembers);

module.exports = router;
