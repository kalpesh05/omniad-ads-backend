const express = require('express');
const router = express.Router();
const controller = require('../controllers/aiCreativeController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);
router.get('/', controller.getCreatives);
router.post('/generate', controller.generateCreative);

module.exports = router;
