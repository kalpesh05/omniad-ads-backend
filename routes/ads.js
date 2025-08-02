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
 *     Creative:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         image_url:
 *           type: string
 *         body:
 *           type: string
 *         title:
 *           type: string
 *     
 *     Channel:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         subscriber_count:
 *           type: number
 *         view_count:
 *           type: number
 *         video_count:
 *           type: number
 *     
 *     Video:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         duration:
 *           type: string
 *         view_count:
 *           type: number
 *         published_at:
 *           type: string
 *           format: date-time
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

// ===========================================
// ADDITIONAL ACCOUNT MANAGEMENT ROUTES
// ===========================================

/**
 * @swagger
 * /api/ads/youtube/channels:
 *   get:
 *     summary: Get YouTube channels
 *     tags: [YouTube Specific]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: YouTube channels retrieved successfully
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
 *                     channels:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Channel'
 */
router.get('/youtube/channels', authenticate, AdsController.getChannels);

/**
 * @swagger
 * /api/ads/youtube/channels/{channelId}/videos:
 *   get:
 *     summary: Get videos for a YouTube channel
 *     tags: [YouTube Specific]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *         description: YouTube channel ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 50
 *         description: Maximum number of videos to return
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [date, relevance, rating, title, viewCount]
 *           default: date
 *     responses:
 *       200:
 *         description: Channel videos retrieved successfully
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
 *                     channelId:
 *                       type: string
 *                     videos:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Video'
 */
router.get('/youtube/channels/:channelId/videos', authenticate, AdsController.getChannelVideos);

/**
 * @swagger
 * /api/ads/facebook/businesses:
 *   get:
 *     summary: Get Facebook business accounts
 *     tags: [Facebook Specific]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Business accounts retrieved successfully
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
 *                     businesses:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           verification_status:
 *                             type: string
 */
router.get('/facebook/businesses', authenticate, AdsController.getBusinessAccounts);

/**
 * @swagger
 * /api/ads/facebook/instagram-accounts:
 *   get:
 *     summary: Get Instagram accounts connected to Facebook
 *     tags: [Facebook Specific]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Instagram accounts retrieved successfully
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
 *                     instagram_accounts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           username:
 *                             type: string
 *                           name:
 *                             type: string
 *                           profile_picture_url:
 *                             type: string
 */
router.get('/facebook/instagram-accounts', authenticate, AdsController.getInstagramAccounts);

// ===========================================
// FACEBOOK CREATIVE MANAGEMENT
// ===========================================

/**
 * @swagger
 * /api/ads/facebook/accounts/{accountId}/creatives:
 *   get:
 *     summary: Get Facebook ad creatives
 *     tags: [Facebook Specific]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *         description: Facebook ad account ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 25
 *         description: Number of creatives to return
 *     responses:
 *       200:
 *         description: Ad creatives retrieved successfully
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
 *                     creatives:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Creative'
 */
router.get('/facebook/accounts/:accountId/creatives', authenticate, AdsController.getAdCreatives);

/**
 * @swagger
 * /api/ads/facebook/accounts/{accountId}/creatives:
 *   post:
 *     summary: Create Facebook ad creative
 *     tags: [Facebook Specific]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *         description: Facebook ad account ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - object_story_spec
 *             properties:
 *               name:
 *                 type: string
 *               object_story_spec:
 *                 type: object
 *                 properties:
 *                   page_id:
 *                     type: string
 *                   link_data:
 *                     type: object
 *               call_to_action_type:
 *                 type: string
 *     responses:
 *       201:
 *         description: Creative created successfully
 */
router.post('/facebook/accounts/:accountId/creatives', authenticate, AdsController.createAdCreative);

/**
 * @swagger
 * /api/ads/facebook/accounts/{accountId}/images:
 *   post:
 *     summary: Upload image to Facebook
 *     tags: [Facebook Specific]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *         description: Facebook ad account ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               filename:
 *                 type: string
 *     responses:
 *       201:
 *         description: Image uploaded successfully
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
 *                     hash:
 *                       type: string
 *                     url:
 *                       type: string
 */
router.post('/facebook/accounts/:accountId/images', authenticate, AdsController.uploadImage);

// ===========================================
// YOUTUBE SPECIFIC ROUTES
// ===========================================

/**
 * @swagger
 * /api/ads/youtube/accounts/{accountId}/adsets/{adSetId}/bumper-ads:
 *   post:
 *     summary: Create YouTube Bumper Ad
 *     tags: [YouTube Specific]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *         description: Google Ads account ID
 *       - in: path
 *         name: adSetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Ad group ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - video_id
 *             properties:
 *               name:
 *                 type: string
 *               video_id:
 *                 type: string
 *               final_urls:
 *                 type: array
 *                 items:
 *                   type: string
 *               display_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Bumper ad created successfully
 */
router.post('/youtube/accounts/:accountId/adsets/:adSetId/bumper-ads', authenticate, AdsController.createBumperAd);

/**
 * @swagger
 * /api/ads/youtube/accounts/{accountId}/adgroups/{adGroupId}/targeting/channels:
 *   post:
 *     summary: Add YouTube channel targeting
 *     tags: [YouTube Specific]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: adGroupId
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
 *               - channel_id
 *             properties:
 *               channel_id:
 *                 type: string
 *               bid_modifier:
 *                 type: number
 *                 minimum: 0.1
 *                 maximum: 10
 *     responses:
 *       201:
 *         description: Channel targeting added successfully
 */
router.post('/youtube/accounts/:accountId/adgroups/:adGroupId/targeting/channels', authenticate, AdsController.addChannelTargeting);

/**
 * @swagger
 * /api/ads/youtube/accounts/{accountId}/assets/videos:
 *   post:
 *     summary: Upload video asset to YouTube
 *     tags: [YouTube Specific]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - video
 *               - title
 *             properties:
 *               video:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Video uploaded successfully
 */
router.post('/youtube/accounts/:accountId/assets/videos', authenticate, AdsController.uploadVideoAsset);

/**
 * @swagger
 * /api/ads/youtube/accounts/{accountId}/reports/video-performance:
 *   get:
 *     summary: Get YouTube video performance report
 *     tags: [YouTube Specific]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: video_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Video performance report retrieved successfully
 */
router.get('/youtube/accounts/:accountId/reports/video-performance', authenticate, AdsController.getVideoPerformanceReport);

/**
 * @swagger
 * /api/ads/youtube/channels/{channelId}/analytics:
 *   get:
 *     summary: Get YouTube channel analytics
 *     tags: [YouTube Specific]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: metrics
 *         schema:
 *           type: string
 *         description: Comma-separated list of metrics
 *     responses:
 *       200:
 *         description: Channel analytics retrieved successfully
 */
router.get('/youtube/channels/:channelId/analytics', authenticate, AdsController.getChannelAnalytics);

// ===========================================
// FACEBOOK TARGETING ROUTES
// ===========================================

/**
 * @swagger
 * /api/ads/facebook/targeting/{type}:
 *   get:
 *     summary: Get Facebook targeting options
 *     tags: [Facebook Specific]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [interests, behaviors, demographics, geo_locations]
 *         description: Type of targeting options
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query for targeting options
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 25
 *     responses:
 *       200:
 *         description: Targeting options retrieved successfully
 */
router.get('/facebook/targeting/:type', authenticate, AdsController.getTargetingOptions);

/**
 * @swagger
 * /api/ads/facebook/accounts/{accountId}/delivery-estimate:
 *   post:
 *     summary: Get Facebook delivery estimate
 *     tags: [Facebook Specific]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *               - targeting_spec
 *               - optimization_goal
 *             properties:
 *               targeting_spec:
 *                 type: object
 *               optimization_goal:
 *                 type: string
 *               daily_budget:
 *                 type: number
 *     responses:
 *       200:
 *         description: Delivery estimate retrieved successfully
 */
router.post('/facebook/accounts/:accountId/delivery-estimate', authenticate, AdsController.getDeliveryEstimate);

// ===========================================
// UPDATED REPORTING ROUTE
// ===========================================

/**
 * @swagger
 * /api/ads/{platform}/accounts/{accountId}/{objectId}/insights:
 *   get:
 *     summary: Get insights/reports for ads objects (alternative path)
 *     tags: [Ads Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [facebook, google, youtube]
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
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: fields
 *         schema:
 *           type: string
 *         description: Comma-separated list of metrics
 *     responses:
 *       200:
 *         description: Insights retrieved successfully
 */
router.get('/:platform/accounts/:accountId/:objectId/insights', authenticate, AdsController.getInsights);

// ===========================================
// BULK OPERATIONS
// ===========================================

/**
 * @swagger
 * /api/ads/{platform}/accounts/{accountId}/campaigns/bulk/status:
 *   put:
 *     summary: Bulk update campaign status
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [facebook, google, youtube]
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
 *               - campaign_ids
 *               - status
 *             properties:
 *               campaign_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, PAUSED, ENABLED, DISABLED]
 *     responses:
 *       200:
 *         description: Campaign statuses updated successfully
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
 *                     updated_count:
 *                       type: number
 *                     failed_count:
 *                       type: number
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 */
router.put('/:platform/accounts/:accountId/campaigns/bulk/status', authenticate, AdsController.bulkUpdateCampaignStatus);



module.exports = router;