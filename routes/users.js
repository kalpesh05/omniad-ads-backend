const express = require('express');
const UserController = require('../controllers/userController');
const { authenticateToken, requireAdmin, requireAdminOrModerator } = require('../middleware/auth');
const { validateUserUpdate } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Admin/Moderator routes
router.get('/', requireAdminOrModerator, UserController.getAllUsers);
router.get('/stats', requireAdminOrModerator, UserController.getUserStats);
router.get('/:id', requireAdminOrModerator, UserController.getUserById);
router.put('/:id', requireAdminOrModerator, validateUserUpdate, UserController.updateUser);

// Admin only routes
router.delete('/:id', requireAdmin, UserController.deleteUser);

module.exports = router;