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
      
      // Add customerId for Google Ads if needed
      if (validatedPlatform === 'google') {
        campaignData.customerId = accountId;
      }

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
      if (validatedPlatform === 'google') {
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
      
      const result = await adsManager.getAdSets(userId, accountId, campaignId);
      
      if (!result.success) {
        return ApiResponse.error(res, result.error, result.status || 400);
      }

      ApiResponse.success(res, {
        platform: validatedPlatform,
        accountId,
        ...(campaignId && { campaignId }),
        adSets: result.data
      }, `${validatedPlatform === 'google' ? 'Ad groups' : 'Ad sets'} retrieved successfully`);
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
      
      // Add customerId for Google Ads if needed
      if (validatedPlatform === 'google') {
        adSetData.customerId = accountId;
      }

      const result = await adsManager.createAdSet(userId, campaignId, adSetData);
      
      if (!result.success) {
        return ApiResponse.error(res, result.error, result.status || 400);
      }

      ApiResponse.created(res, {
        platform: validatedPlatform,
        accountId,
        campaignId,
        adSet: result.data
      }, `${validatedPlatform === 'google' ? 'Ad group' : 'Ad set'} created successfully`);
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
      
      // Add customerId for Google Ads if needed
      if (validatedPlatform === 'google') {
        adData.customerId = accountId;
      }

      const result = await adsManager.createAd(userId, adSetId, adData);
      
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
        if (validatedPlatform === 'google') {
          result = await adsManager.getCustomInsights(userId, accountId, startDate, endDate, level, metricsFields);
        } else {
          result = await adsManager.getCustomInsights(userId, objectId, startDate, endDate, level, metricsFields);
        }
      } else {
        // Date preset
        if (validatedPlatform === 'google') {
          result = await adsManager.getInsights(userId, accountId, level, datePreset.toUpperCase(), metricsFields);
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