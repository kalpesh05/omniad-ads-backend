const express = require('express');
const router = express.Router();
const controller = require('../controllers/clientPortalController');
const { verifyToken } = require('../middleware/auth');

// Public routes for the client (no auth required)
router.get('/verify/:token', controller.verifyPortalToken);
router.post('/complete/:token', controller.completeOnboarding);

// Protected routes for the agency
router.use(verifyToken);
router.get('/', controller.getPortals);
router.post('/generate', controller.generateMagicLink);

module.exports = router;
