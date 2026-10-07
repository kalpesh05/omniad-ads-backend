const express = require('express');
const router = express.Router();
const SocialController = require('../controllers/socialController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/social/media - Fetch paginated & filtered organic posts/reels
router.get('/media', SocialController.getMedia);

// GET /api/social/overview - Summary metrics, platform distribution, top performers
router.get('/overview', SocialController.getOverview);

// POST /api/social/sync/:platform - Trigger sync for instagram, facebook, youtube, etc.
router.post('/sync/:platform', SocialController.syncPlatform);

// POST /api/social/analyze/:id - Run AI Content Autopsy and generate next-gen scripts
router.post('/analyze/:id', SocialController.analyzeMedia);

// POST /api/social/repurpose/:id - Cross-channel content repurposing
router.post('/repurpose/:id', SocialController.repurposeMedia);

// POST /api/social/boost/:id - Organic-to-Paid Spark Engine (1-Click Boost)
router.post('/boost/:id', SocialController.boostMedia);

module.exports = router;
