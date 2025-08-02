const AdsManagerFactory = require('../services/adsManagerFactory');
const ApiResponse = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

class AdsController {
  // ===========================================
  // ACCOUNT MANAGEMENT
  // ===========================================

  // Get ad accounts for a platform
  static getAdAccounts = asyncHandler(async (req, res) => {
    const { platform } = req.params;
    const userId = req.user.id;

    try {
      const validatedPlatform = AdsManagerFactory.validatePlatform(platform);
      const adsManager = AdsManagerFactory.createManager(validatedPlatform);
      
      const result = await adsManager.getAdAccounts(userId);
      
      if (!result.success) {
        return ApiResponse.error(res, result.error, result.status || 400);
      }

      ApiResponse.success(res, {
        platform: validatedPlatform,
        accounts: result.data
      }, 'Ad accounts retrieved successfully');
    } catch (error) {
      ApiResponse.error(res, error.message, 400);
    }
  });

  // Get YouTube channels (YouTube specific)
  static getChannels = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    try {
      const adsManager = AdsManagerFactory.createManager('youtube');
      const result = await adsManager.getChannels(userId);
      
      if (!result.success) {
        return ApiResponse.error(res, result.error, result.status || 400);
      }

      ApiResponse.success(res, {
        platform: 'youtube',
        channels: result.data
      }, 'YouTube channels retrieved successfully');
    } catch (error) {
      ApiResponse.error(res, error.message, 400);
    }
  });

  // Get channel videos (YouTube specific)
  static getChannelVideos = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const { maxResults = 50 } = req.query;
    const userId = req.user.id;

    try {
      const adsManager = AdsManagerFactory.createManager('youtube');
      const result = await adsManager.getChannelVideos(userId, channelId, parseInt(maxResults));
      
      if (!result.success) {
        return ApiResponse.error(res, result.error, result.status || 400);
      }

      ApiResponse.success(res, {
        platform: 'youtube',
        channelId,
        videos: result.data
      }, 'Channel videos retrieved successfully');
    } catch (error) {
      ApiResponse.error(res, error.message, 400);
    }
  });

  // Get business accounts (Facebook specific)
  static getBusinessAccounts = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    try {
      const adsManager = AdsManagerFactory.createManager('facebook');
      const result = await adsManager.getBusinessAccounts(userId);
      
      if (!result.success) {
        return ApiResponse.error(res, result.error, result.status || 400);
      }

      ApiResponse.success(res, {
        platform: 'facebook',
        businesses: result.data
      }, 'Business accounts retrieved successfully');
    } catch (error) {
      ApiResponse.error(res, error.message, 400);
    }
  });

  // Get Instagram accounts (Facebook specific)
  static getInstagramAccounts = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    try {
      const adsManager = AdsManagerFactory.createManager('facebook');
      const result = await adsManager.getInstagramAccounts(userId);
      
      if (!result.success) {
        return ApiResponse.error(res, result.error, result.status || 400);
      }

      ApiResponse.success(res, {
        platform: 'facebook',
        accounts: result.data
      }, 'Instagram accounts retrieved successfully');
    } catch (error) {
      ApiResponse.error(res, error.message, 400);
    }
  });

  // ===========================================
  // CAMPAIGN MANAGEMENT
  // ===========================================

  // Get campaigns
  static getCampaigns = asyncHandler(async (req, res) => {
    const { platform, accountId } = req.params;
    const { status, campaignType, objective } = req.query;
    const userId = req.user.id;

    try {
      const validatedPlatform = AdsManagerFactory.validatePlatform(platform);
      const adsManager = AdsManagerFactory.createManager(validatedPlatform);
      
      const filters = {};
      if (status) filters.status = status;
      if (campaignType) filters.campaignType = campaignType;
      if (objective) filters.objective = objective;

      const result = await adsManager.getCampaigns(userId, accountId, filters);
      
      if (!result.success) {
        return ApiResponse.error(res, result.error, result.status || 400);
      }

      ApiResponse.success(res, {
        platform: validatedPlatform,
        accountId,
        campaigns: result.data
      }, 'Campaigns retrieved successfully');
    } catch (error) {
      ApiResponse.error(res, error.message, 400);
    }
  });

  // Create campaign
  static createCampaign = asyncHandler(async (req, res) => {
    const { platform, accountId } = req.params;
    const campaignData = req.body;
    const userId = req.user.id;

    try {
      const validatedPlatform = AdsManagerFactory.validatePlatform(platform);
      const adsManager = AdsManagerFactory.createManager(validatedPlatform);
      
      const result = await adsManager.createCampaign(userId, accountId, campaignData);
      
      if (!result.success) {
        return ApiResponse.error(res, result.error, result.status || 400);
      }

      ApiResponse.created(res, {
        platform: validatedPlatform,
        accountId,
        campaign: result.data
      }, 'Campaign created successfully');
    } catch (error) {
      ApiResponse.error(res, error.message, 400);
    }
  });

  // Update campaign
  static updateCampaign = asyncHandler(async (req, res) => {
    const { platform, accountId, campaignId } = req.params;
    const updates = req.body;
    const userId = req.user.id;

    try {
      const validatedPlatform = AdsManagerFactory.validatePlatform(platform);
      const adsManager = AdsManagerFactory.createManager(validatedPlatform);
      
      let result;
      if (validatedPlatform === 'youtube' || validatedPlatform === 'google') {
        result = await adsManager.updateCampaign(userId, accountId, campaignId, updates);
      } else {
        result = await adsManager.updateCampaign(userId, campaignId, updates);
      }
      
      if (!result.success) {
        return ApiResponse.error(res, result.error, result.status || 400);
      }

      ApiResponse.success(res, {
        platform: validatedPlatform,
        accountId,
        campaignId,
        campaign: result.data
      }, 'Campaign updated successfully');
    } catch (error) {
      ApiResponse.error(res, error.message, 400);
    }
  });

  // ===========================================
  // AD SET/AD GROUP MANAGEMENT
  // ===========================================

  // Get ad sets/ad groups
  static getAdSets = asyncHandler(async (req, res) => {
    const { platform, accountId } = req.params;
    const { campaignId } = req.query;
    const userId = req.user.id;

    try {
      const validatedPlatform = AdsManagerFactory.validatePlatform(platform);
      const adsManager = AdsManagerFactory.createManager(validatedPlatform);
      
      let result;
      if (validatedPlatform === 'youtube') {
        result = await adsManager.getAdGroups(userId, accountId, campaignId);
      } else {
        result = await adsManager.getAdSets(userId, accountId, campaignId);
      }
      
      if (!result.success) {
        return ApiResponse.error(res, result.error, result.status || 400);
      }

      const entityName = validatedPlatform === 'youtube' ? 'Ad groups' : 'Ad sets';
      const dataKey = validatedPlatform === 'youtube' ? 'adGroups' : 'adSets';

      ApiResponse.success(res, {
        platform: validatedPlatform,
        accountId,
        ...(campaignId && { campaignId }),
        [dataKey]: result.data
      }, `${entityName} retrieved successfully`);
    } catch (error) {
      ApiResponse.error(res, error.message, 400);
    }
  });

  // Create ad set/ad group
  static createAdSet = asyncHandler(async (req, res) => {
    const { platform, accountId, campaignId } = req.params;
    const adSetData = req.body;
    const userId = req.user.id;

    try {
      const validatedPlatform = AdsManagerFactory.validatePlatform(platform);
      const adsManager = AdsManagerFactory.createManager(validatedPlatform);
      
      let result;
      if (validatedPlatform === 'youtube') {
        adSetData.campaignId = campaignId;
        result = await adsManager.createAdGroup(userId, accountId, adSetData);
      } else {
        result = await adsManager.createAdSet(userId, campaignId, adSetData);
      }
      
      if (!result.success) {
        return ApiResponse.error(res, result.error, result.status || 400);
      }

      const entityName = validatedPlatform === 'youtube' ? 'Ad group' : 'Ad set';
      
      ApiResponse.created(res, {
        platform: validatedPlatform,
        accountId,
        campaignId,
        [validatedPlatform === 'youtube' ? 'adGroup' : 'adSet']: result.data
      }, `${entityName} created successfully`);
    } catch (error) {
      ApiResponse.error(res, error.message, 400);
    }
  });

  // ===========================================
  // AD MANAGEMENT
  // ===========================================

  // Get ads
  static getAds = asyncHandler(async (req, res) => {
    const { platform, accountId } = req.params;
    const { adSetId } = req.query;
    const userId = req.user.id;

    try {
      const validatedPlatform = AdsManagerFactory.validatePlatform(platform);
      const adsManager = AdsManagerFactory.createManager(validatedPlatform);
      
      const result = await adsManager.getAds(userId, accountId, adSetId);
      
      if (!result.success) {
        return ApiResponse.error(res, result.error, result.status || 400);
      }

      ApiResponse.success(res, {
        platform: validatedPlatform,
        accountId,
        ...(adSetId && { adSetId }),
        ads: result.data
      }, 'Ads retrieved successfully');
    } catch (error) {
      ApiResponse.error(res, error.message, 400);
    }
  });

  // Create ad
  static createAd = asyncHandler(async (req, res) => {
    const { platform, accountId, adSetId } = req.params;
    const adData = req.body;
    const userId = req.user.id;

    try {
      const validatedPlatform = AdsManagerFactory.validatePlatform(platform);
      const adsManager = AdsManagerFactory.createManager(validatedPlatform);
      
      let result;
      if (validatedPlatform === 'youtube') {
        adData.adGroupId = adSetId;
        result = await adsManager.createAd(userId, accountId, adData);
      } else {
        result = await adsManager.createAd(userId, adSetId, adData);
      }
      
      if (!result.success) {
        return ApiResponse.error(res, result.error, result.status || 400);
      }

      ApiResponse.created(res, {
        platform: validatedPlatform,
        accountId,
        adSetId,
        ad: result.data
      }, 'Ad created successfully');
    } catch (error) {
      ApiResponse.error(res, error.message, 400);
    }
  });

  // ===========================================
  // CREATIVE MANAGEMENT (Facebook specific)
  // ===========================================

  // Get ad creatives
  static getAdCreatives = asyncHandler(async (req, res) => {
    const { accountId } = req.params;
    const userId = req.user.id;

    try {
      const adsManager = AdsManagerFactory.createManager('facebook');
      const result = await adsManager.getAdCreatives(userId, accountId);
      
      if (!result.success) {
        return ApiResponse.error(res, result.error, result.status || 400);
      }

      ApiResponse.success(res, {
        platform: 'facebook',
        accountId,
        creatives: result.data
      }, 'Ad creatives retrieved successfully');
    } catch (error) {
      ApiResponse.error(res, error.message, 400);
    }
  });

  // Create ad creative
  static createAdCreative = asyncHandler(async (req, res) => {
    const { accountId } = req.params;
    const creativeData = req.body;
    const userId = req.user.id;

    try {
      const adsManager = AdsManagerFactory.createManager('facebook');
      const result = await adsManager.createAdCreative(userId, accountId, creativeData);
      
      if (!result.success) {
        return ApiResponse.error(res, result.error, result.status || 400);
      }

      ApiResponse.created(res, {
        platform: 'facebook',
        accountId,
        creative: result.data
      }, 'Ad creative created successfully');
    } catch (error) {
      ApiResponse.error(res, error.message, 400);
    }
  });

  // Upload image
  static uploadImage = asyncHandler(async (req, res) => {
    const { accountId } = req.params;
    const imageData = req.body;
    const userId = req.user.id;

    try {
      const adsManager = AdsManagerFactory.createManager('facebook');
      const result = await adsManager.uploadImage(userId, accountId, imageData);
      
      if (!result.success) {
        return ApiResponse.error(res, result.error, result.status || 400);
      }

      ApiResponse.created(res, {
        platform: 'facebook',
        accountId,
        image: result.data
      }, 'Image uploaded successfully');
    } catch (error) {
      ApiResponse.error(res, error.message, 400);
    }
  });

  // ===========================================
  // YOUTUBE SPECIFIC METHODS
  // ===========================================

  // Create Bumper Ad
  static createBumperAd = asyncHandler(async (req, res) => {
    const { accountId, adSetId } = req.params;
    const adData = req.body;
    const userId = req.user.id;

    try {
      const adsManager = AdsManagerFactory.createManager('youtube');
      adData.adGroupId = adSetId;
      
      const result = await adsManager.createBumperAd(userId, accountId, adData);
      
      if (!result.success) {
        return ApiResponse.error(res, result.error, result.status || 400);
      }

      ApiResponse.created(res, {
        platform: 'youtube',
        accountId,
        adSetId,
        ad: result.data
      }, 'Bumper ad created successfully');
    } catch (error) {
      ApiResponse.error(res, error.message, 400);
    }
  });

  // Add channel targeting
  static addChannelTargeting = asyncHandler(async (req, res) => {
    const { accountId, adGroupId } = req.params;
    const { channelIds } = req.body;
    const userId = req.user.id;

    try {
      const adsManager = AdsManagerFactory.createManager('youtube');
      const result = await adsManager.addChannelTargeting(userId, accountId, adGroupId, channelIds);
      
      if (!result.success) {
        return ApiResponse.error(res, result.error, result.status || 400);
      }

      ApiResponse.success(res, {
        platform: 'youtube',
        accountId,
        adGroupId,
        targeting: result.data
      }, 'Channel targeting added successfully');
    } catch (error) {
      ApiResponse.error(res, error.message, 400);
    }
  });

  // Upload video asset
  static uploadVideoAsset = asyncHandler(async (req, res) => {
    const { accountId } = req.params;
    const assetData = req.body;
    const userId = req.user.id;

    try {
      const adsManager = AdsManagerFactory.createManager('youtube');
      const result = await adsManager.uploadVideoAsset(userId, accountId, assetData);
      
      if (!result.success) {
        return ApiResponse.error(res, result.error, result.status || 400);
      }

      ApiResponse.created(res, {
        platform: 'youtube',
        accountId,
        asset: result.data
      }, 'Video asset uploaded successfully');
    } catch (error) {
      ApiResponse.error(res, error.message, 400);
    }
  });

  // Get video performance report
  static getVideoPerformanceReport = asyncHandler(async (req, res) => {
    const { accountId } = req.params;
    const { startDate, endDate } = req.query;
    const userId = req.user.id;

    try {
      const adsManager = AdsManagerFactory.createManager('youtube');
      const dateRange = { start: startDate, end: endDate };
      
      const result = await adsManager.getVideoPerformanceReport(userId, accountId, dateRange);
      
      if (!result.success) {
        return ApiResponse.error(res, result.error, result.status || 400);
      }

      ApiResponse.success(res, {
        platform: 'youtube',
        accountId,
        dateRange,
        report: result.data
      }, 'Video performance report retrieved successfully');
    } catch (error) {
      ApiResponse.error(res, error.message, 400);
    }
  });

  // Get channel analytics
  static getChannelAnalytics = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const { startDate, endDate } = req.query;
    const userId = req.user.id;

    try {
      const adsManager = AdsManagerFactory.createManager('youtube');
      const result = await adsManager.getChannelAnalytics(userId, channelId, startDate, endDate);
      
      if (!result.success) {
        return ApiResponse.error(res, result.error, result.status || 400);
      }

      ApiResponse.success(res, {
        platform: 'youtube',
        channelId,
        dateRange: { startDate, endDate },
        analytics: result.data
      }, 'Channel analytics retrieved successfully');
    } catch (error) {
      ApiResponse.error(res, error.message, 400);
    }
  });

  // ===========================================
  // TARGETING HELPERS (Facebook specific)
  // ===========================================

  // Get targeting options
  static getTargetingOptions = asyncHandler(async (req, res) => {
    const { type } = req.params;
    const { query = '' } = req.query;
    const userId = req.user.id;

    try {
      const adsManager = AdsManagerFactory.createManager('facebook');
      const result = await adsManager.getTargetingOptions(userId, type, query);
      
      if (!result.success) {
        return ApiResponse.error(res, result.error, result.status || 400);
      }

      ApiResponse.success(res, {
        platform: 'facebook',
        type,
        options: result.data
      }, 'Targeting options retrieved successfully');
    } catch (error) {
      ApiResponse.error(res, error.message, 400);
    }
  });

  // Get delivery estimate
  static getDeliveryEstimate = asyncHandler(async (req, res) => {
    const { accountId } = req.params;
    const { targeting, optimizationGoal } = req.body;
    const userId = req.user.id;

    try {
      const adsManager = AdsManagerFactory.createManager('facebook');
      const result = await adsManager.getDeliveryEstimate(userId, accountId, targeting, optimizationGoal);
      
      if (!result.success) {
        return ApiResponse.error(res, result.error, result.status || 400);
      }

      ApiResponse.success(res, {
        platform: 'facebook',
        accountId,
        estimate: result.data
      }, 'Delivery estimate retrieved successfully');
    } catch (error) {
      ApiResponse.error(res, error.message, 400);
    }
  });

  // ===========================================
  // REPORTING & ANALYTICS
  // ===========================================

  // Get insights/reports
  static getInsights = asyncHandler(async (req, res) => {
    const { platform, accountId, objectId } = req.params;
    const { 
      level = 'campaign', 
      datePreset = 'last_30d', 
      startDate, 
      endDate, 
      fields 
    } = req.query;
    const userId = req.user.id;

    try {
      const validatedPlatform = AdsManagerFactory.validatePlatform(platform);
      const adsManager = AdsManagerFactory.createManager(validatedPlatform);
      
      let result;
      const metricsFields = fields ? fields.split(',') : null;

      if (startDate && endDate) {
        // Custom date range
        if (validatedPlatform === 'youtube') {
          const dateRange = { start: startDate, end: endDate };
          result = await adsManager.getInsights(userId, accountId, level, dateRange, metricsFields);
        } else {
          result = await adsManager.getCustomInsights(userId, objectId, startDate, endDate, level, metricsFields);
        }
      } else {
        // Date preset
        if (validatedPlatform === 'youtube') {
          result = await adsManager.getInsights(userId, accountId, level, null, metricsFields);
        } else {
          result = await adsManager.getInsights(userId, objectId, level, datePreset, metricsFields);
        }
      }
      
      if (!result.success) {
        return ApiResponse.error(res, result.error, result.status || 400);
      }

      ApiResponse.success(res, {
        platform: validatedPlatform,
        accountId,
        objectId,
        level,
        dateRange: startDate && endDate ? { startDate, endDate } : { preset: datePreset },
        insights: result.data
      }, 'Insights retrieved successfully');
    } catch (error) {
      ApiResponse.error(res, error.message, 400);
    }
  });

  // ===========================================
  // BULK OPERATIONS
  // ===========================================

  // Bulk update campaign status
  static bulkUpdateCampaignStatus = asyncHandler(async (req, res) => {
    const { platform, accountId } = req.params;
    const { campaignIds, status } = req.body;
    const userId = req.user.id;

    try {
      const validatedPlatform = AdsManagerFactory.validatePlatform(platform);
      const adsManager = AdsManagerFactory.createManager(validatedPlatform);
      
      let result;
      if (validatedPlatform === 'youtube') {
        result = await adsManager.bulkUpdateCampaignStatus(userId, accountId, campaignIds, status);
      } else {
        result = await adsManager.bulkUpdateCampaignStatus(userId, campaignIds, status);
      }
      
      if (!result.success) {
        return ApiResponse.error(res, result.error, result.status || 400);
      }

      ApiResponse.success(res, {
        platform: validatedPlatform,
        accountId,
        updatedCampaigns: result.data
      }, 'Campaign statuses updated successfully');
    } catch (error) {
      ApiResponse.error(res, error.message, 400);
    }
  });

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  // Get supported platforms
  static getSupportedPlatforms = asyncHandler(async (req, res) => {
    const platforms = AdsManagerFactory.getSupportedPlatforms();
    
    ApiResponse.success(res, {
      platforms,
      count: platforms.length
    }, 'Supported platforms retrieved successfully');
  });

  // Health check for platform connectivity
  static checkPlatformHealth = asyncHandler(async (req, res) => {
    const { platform } = req.params;
    const userId = req.user.id;

    try {
      const validatedPlatform = AdsManagerFactory.validatePlatform(platform);
      const adsManager = AdsManagerFactory.createManager(validatedPlatform);
      
      // Try to get ad accounts as a health check
      const result = await adsManager.getAdAccounts(userId);
      
      ApiResponse.success(res, {
        platform: validatedPlatform,
        healthy: result.success,
        status: result.success ? 'connected' : 'error',
        ...(result.error && { error: result.error })
      }, `${validatedPlatform} platform health check completed`);
    } catch (error) {
      ApiResponse.success(res, {
        platform,
        healthy: false,
        status: 'error',
        error: error.message
      }, 'Platform health check completed with errors');
    }
  });
}

module.exports = AdsController;