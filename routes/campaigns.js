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

router.get('/', AdsController.getAllCampaignsGeneric ? AdsController.getAllCampaignsGeneric : async (req, res) => {
    // Stub for generic cross-platform campaign fetch if not yet implemented
    res.status(501).json({ success: false, message: 'Top-level campaign aggregation pending backend query refactor' });
});

router.post('/', validateCreateCampaign, AdsController.createCampaignGeneric ? AdsController.createCampaignGeneric : async (req, res) => {
    res.status(501).json({ success: false, message: 'Generic campaign creation requires accountId parsing logic to be refactored from AdsController' });
});

router.get('/:id', async (req, res) => {
    res.status(501).json({ success: false, message: 'Campaign specific fetch pending' });
});

router.put('/:id', validateUpdateCampaign, async (req, res) => {
    res.status(501).json({ success: false, message: 'Campaign generic update pending' });
});

router.delete('/:id', async (req, res) => {
    res.status(501).json({ success: false, message: 'Campaign generic delete pending' });
});

router.patch('/:id/status', async (req, res) => {
    res.status(501).json({ success: false, message: 'Campaign status patch pending' });
});

router.post('/:id/sync', async (req, res) => {
    res.status(501).json({ success: false, message: 'Campaign generic sync pending' });
});

module.exports = router;
