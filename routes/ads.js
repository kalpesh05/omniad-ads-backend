const express = require('express');
const AdsController = require('../controllers/adsController');
const { authenticate } = require('../middleware/auth');
const { validate, adsSchemas } = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     AdAccount:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         status:
 *           type: string
 *         currency:
 *           type: string
 *         timezone:
 *           type: string
 *     
 *     Campaign:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         status:
 *           type: string
 *         objective:
 *           type: string
 *         budget:
 *           type: object
 *         created_time:
 *           type: string
 *           format: date-time
 *     
 *     AdSet:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         status:
 *           type: string
 *         campaign_id:
 *           type: string
 *         daily_budget:
 *           type: number
 *         targeting:
 *           type: object
 *     
 *     Ad:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         status:
 *           type: string
 *         adset_id:
 *           type: string
 *         creative:
 *           type: object
 *     
 *     Insights:
 *       type: object
 *       properties:
 *         impressions:
 *           type: number
 *         clicks:
 *           type: number
 *         spend:
 *           type: number
 *         conversions:
 *           type: number
 *         ctr:
 *           type: number
 *         cpc:
 *           type: number
 *         cpm:
 *           type: number
 */

// ===========================================
// UTILITY ROUTES
// ===========================================

/**
 * @swagger
 * /api/ads/platforms:
 *   get:
 *     summary: Get supported advertising platforms
 *     tags: [Ads Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Supported platforms retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     platforms:
 *                       type: array
 *                       items:
 *                         type: string
 *                     count:
 *                       type: number
 */
router.get('/platforms', authenticate, AdsController.getSupportedPlatforms);

/**
 * @swagger
 * /api/ads/{platform}/health:
 *   get:
 *     summary: Check platform connectivity health
 *     tags: [Ads Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [facebook, google]
 *         description: Advertising platform
 *     responses:
 *       200:
 *         description: Platform health check completed
 */
router.get('/:platform/health', authenticate, AdsController.checkPlatformHealth);

// ===========================================
// ACCOUNT MANAGEMENT
// ===========================================

/**
 * @swagger
 * /api/ads/{platform}/accounts:
 *   get:
 *     summary: Get ad accounts for a platform
 *     tags: [Ads Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [facebook, google]
 *         description: Advertising platform
 *     responses:
 *       200:
 *         description: Ad accounts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     platform:
 *                       type: string
 *                     accounts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AdAccount'
 */
router.get('/:platform/accounts', authenticate, AdsController.getAdAccounts);

// ===========================================
// CAMPAIGN MANAGEMENT
// ===========================================

/**
 * @swagger
 * /api/ads/{platform}/accounts/{accountId}/campaigns:
 *   get:
 *     summary: Get campaigns for an ad account
 *     tags: [Ads Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [facebook, google]
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, PAUSED, ENABLED, DISABLED]
 *       - in: query
 *         name: campaignType
 *         schema:
 *           type: string
 *       - in: query
 *         name: objective
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Campaigns retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     platform:
 *                       type: string
 *                     accountId:
 *                       type: string
 *                     campaigns:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Campaign'
 */
router.get('/:platform/accounts/:accountId/campaigns', authenticate, AdsController.getCampaigns);

/**
 * @swagger
 * /api/ads/{platform}/accounts/{accountId}/campaigns:
 *   post:
 *     summary: Create a new campaign
 *     tags: [Ads Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [facebook, google]
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               objective:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, PAUSED, ENABLED, DISABLED]
 *               dailyBudget:
 *                 type: number
 *               lifetimeBudget:
 *                 type: number
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Campaign created successfully
 */
router.post('/:platform/accounts/:accountId/campaigns',
  authenticate,
  validate(adsSchemas.createCampaign),
  AdsController.createCampaign
);

/**
 * @swagger
 * /api/ads/{platform}/accounts/{accountId}/campaigns/{campaignId}:
 *   put:
 *     summary: Update a campaign
 *     tags: [Ads Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [facebook, google]
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               status:
 *                 type: string
 *               dailyBudget:
 *                 type: number
 *               lifetimeBudget:
 *                 type: number
 *     responses:
 *       200:
 *         description: Campaign updated successfully
 */
router.put('/:platform/accounts/:accountId/campaigns/:campaignId',
  authenticate,
  validate(adsSchemas.updateCampaign),
  AdsController.updateCampaign
);

// ===========================================
// AD SET/AD GROUP MANAGEMENT
// ===========================================

/**
 * @swagger
 * /api/ads/{platform}/accounts/{accountId}/adsets:
 *   get:
 *     summary: Get ad sets/ad groups for an account
 *     tags: [Ads Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [facebook, google]
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: campaignId
 *         schema:
 *           type: string
 *         description: Filter by campaign ID
 *     responses:
 *       200:
 *         description: Ad sets retrieved successfully
 */
router.get('/:platform/accounts/:accountId/adsets', authenticate, AdsController.getAdSets);

/**
 * @swagger
 * /api/ads/{platform}/accounts/{accountId}/campaigns/{campaignId}/adsets:
 *   post:
 *     summary: Create a new ad set/ad group
 *     tags: [Ads Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [facebook, google]
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               status:
 *                 type: string
 *               dailyBudget:
 *                 type: number
 *               targeting:
 *                 type: object
 *               optimizationGoal:
 *                 type: string
 *     responses:
 *       201:
 *         description: Ad set created successfully
 */
router.post('/:platform/accounts/:accountId/campaigns/:campaignId/adsets',
  authenticate,
  validate(adsSchemas.createAdSet),
  AdsController.createAdSet
);

// ===========================================
// AD MANAGEMENT
// ===========================================

/**
 * @swagger
 * /api/ads/{platform}/accounts/{accountId}/ads:
 *   get:
 *     summary: Get ads for an account
 *     tags: [Ads Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [facebook, google]
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: adSetId
 *         schema:
 *           type: string
 *         description: Filter by ad set/ad group ID
 *     responses:
 *       200:
 *         description: Ads retrieved successfully
 */
router.get('/:platform/accounts/:accountId/ads', authenticate, AdsController.getAds);

/**
 * @swagger
 * /api/ads/{platform}/accounts/{accountId}/adsets/{adSetId}/ads:
 *   post:
 *     summary: Create a new ad
 *     tags: [Ads Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [facebook, google]
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: adSetId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               status:
 *                 type: string
 *               creativeId:
 *                 type: string
 *               headlines:
 *                 type: array
 *                 items:
 *                   type: string
 *               descriptions:
 *                 type: array
 *                 items:
 *                   type: string
 *               finalUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Ad created successfully
 */
router.post('/:platform/accounts/:accountId/adsets/:adSetId/ads',
  authenticate,
  validate(adsSchemas.createAd),
  AdsController.createAd
);

// ===========================================
// REPORTING & ANALYTICS
// ===========================================

/**
 * @swagger
 * /api/ads/{platform}/accounts/{accountId}/insights/{objectId}:
 *   get:
 *     summary: Get insights/reports for ads objects
 *     tags: [Ads Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [facebook, google]
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: objectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign, Ad Set, or Ad ID
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [account, campaign, adset, ad]
 *           default: campaign
 *       - in: query
 *         name: datePreset
 *         schema:
 *           type: string
 *           enum: [today, yesterday, last_7d, last_14d, last_30d, last_90d]
 *           default: last_30d
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Custom start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Custom end date (YYYY-MM-DD)
 *       - in: query
 *         name: fields
 *         schema:
 *           type: string
 *         description: Comma-separated list of metrics
 *     responses:
 *       200:
 *         description: Insights retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     platform:
 *                       type: string
 *                     accountId:
 *                       type: string
 *                     objectId:
 *                       type: string
 *                     level:
 *                       type: string
 *                     insights:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Insights'
 */
router.get('/:platform/accounts/:accountId/insights/:objectId',
  authenticate,
  validate(adsSchemas.getInsights, 'query'),
  AdsController.getInsights
);

module.exports = router;