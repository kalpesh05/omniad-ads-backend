const express = require('express');
const router = express.Router();
const controller = require('../controllers/mediaBriefingController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);
router.post('/generate', controller.generateBriefing);

module.exports = router;
