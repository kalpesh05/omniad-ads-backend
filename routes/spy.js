const express = require('express');
const router = express.Router();
const controller = require('../controllers/spyController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// Live Competitor Ad Intelligence & Angle Spy
router.get('/search', controller.searchCompetitors);
router.post('/reverse-engineer', controller.reverseEngineerAngle);
router.post('/clone', controller.cloneAngle);

// Legacy support
router.post('/analyze', controller.analyzeCompetitor);

module.exports = router;
