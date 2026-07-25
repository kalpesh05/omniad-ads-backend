const express = require('express');
const router = express.Router();
const controller = require('../controllers/spyController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);
router.post('/analyze', controller.analyzeCompetitor);

module.exports = router;
