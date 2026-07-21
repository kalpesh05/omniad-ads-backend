const express = require('express');
const router = express.Router();
const IntegrationsController = require('../controllers/integrationsController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', IntegrationsController.getConnectedPlatforms);
router.post('/shopify', IntegrationsController.connectShopify);
router.post('/stripe', IntegrationsController.connectStripe);

module.exports = router;
