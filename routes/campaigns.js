// Refactored campaigns.js to match top-level /api/campaigns
const express = require('express');
const router = express.Router();
const AdsController = require('../controllers/adsController');
const { authenticateToken } = require('../middleware/auth');
const {
    validateCreateCampaign,
    validateUpdateCampaign
} = require('../middleware/validation');

// Apply auth to all routes
router.use(authenticateToken);

/**
 * The API Documentation defines:
 * GET /api/campaigns
 * POST /api/campaigns
 * GET /api/campaigns/:id
 * PUT /api/campaigns/:id
 * DELETE /api/campaigns/:id
 * PATCH /api/campaigns/:id/status
 * POST /api/campaigns/:id/sync
 */

// Since the DB implementation for ads_campaigns currently requires 'account_id', 
// we map these top-level generic routes to either aggregate across accounts
// or require accountId in the body/query.

router.get('/', AdsController.getAllCampaignsGeneric);

router.post('/', validateCreateCampaign, AdsController.createCampaignGeneric);

router.get('/:id', AdsController.getCampaignGeneric);

router.put('/:id', validateUpdateCampaign, AdsController.updateCampaignGeneric);

router.delete('/:id', AdsController.deleteCampaignGeneric);

router.patch('/:id/status', AdsController.updateCampaignStatusGeneric);

router.post('/:id/sync', AdsController.syncCampaignGeneric);

module.exports = router;
