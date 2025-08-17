const AdsAccount = require('../models/AdsAccount');
const AdsManagerFactory = require('../services/adsManagerFactory');
const {
    successResponse,
    errorResponse,
    unauthorizedResponse,
    conflictResponse,
    notFoundResponse
} = require('../utils/response');

class AdsController {
    // ===========================================
    // ACCOUNT MANAGEMENT
    // ===========================================

    // Get connected accounts from database
    static async getConnectedAccounts(req, res) {
        try {
            const userId = req.user.id;
            const platform = req.params.platform;   
            const result = await AdsAccount.findByUserAndPlatform(userId, platform);
            if (!result.success) {
                return errorResponse(res, result.error);
            }
            successResponse(res, {
                platform: validatedPlatform,
                accounts: result.data
            }, 'Connected accounts retrieved successfully');
        } catch (error) {
            console.error('Get Connected Accounts Error:', error);
            errorResponse(res, 'Failed to retrieve connected accounts');
        }
    }
    
    // Get ad accounts for a platform
    static async getAdAccounts(req, res) {
        try {
            const { platform } = req.params;
            const userId = req.user.id;

            const validatedPlatform = AdsManagerFactory.validatePlatform(platform);
            const adsManager = AdsManagerFactory.createManager(validatedPlatform);
            
            const result = await adsManager.getAdAccounts(userId);
            
            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                platform: validatedPlatform,
                accounts: result.data
            }, 'Ad accounts retrieved successfully');
        } catch (error) {
            console.error('Get Ad Accounts Error:', error);
            errorResponse(res, 'Failed to retrieve ad accounts');
        }
    }

    // Get YouTube channels (YouTube specific)
    static async getChannels(req, res) {
        try {
            const userId = req.user.id;

            const adsManager = AdsManagerFactory.createManager('youtube');
            const result = await adsManager.getChannels(userId);
            
            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                platform: 'youtube',
                channels: result.data
            }, 'YouTube channels retrieved successfully');
        } catch (error) {
            console.error('Get Channels Error:', error);
            errorResponse(res, 'Failed to retrieve YouTube channels');
        }
    }

    // Get channel videos (YouTube specific)
    static async getChannelVideos(req, res) {
        try {
            const { channelId } = req.params;
            const { maxResults = 50 } = req.query;
            const userId = req.user.id;

            const adsManager = AdsManagerFactory.createManager('youtube');
            const result = await adsManager.getChannelVideos(userId, channelId, parseInt(maxResults));
            
            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                platform: 'youtube',
                channelId,
                videos: result.data
            }, 'Channel videos retrieved successfully');
        } catch (error) {
            console.error('Get Channel Videos Error:', error);
            errorResponse(res, 'Failed to retrieve channel videos');
        }
    }

    // Get business accounts (Facebook specific)
    static async getBusinessAccounts(req, res) {
        try {
            const userId = req.user.id;

            const adsManager = AdsManagerFactory.createManager('facebook');
            const result = await adsManager.getBusinessAccounts(userId);
            
            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                platform: 'facebook',
                businesses: result.data
            }, 'Business accounts retrieved successfully');
        } catch (error) {
            console.error('Get Business Accounts Error:', error);
            errorResponse(res, 'Failed to retrieve business accounts');
        }
    }

    // Get Instagram accounts (Facebook specific)
    static async getInstagramAccounts(req, res) {
        try {
            const userId = req.user.id;

            const adsManager = AdsManagerFactory.createManager('facebook');
            const result = await adsManager.getInstagramAccounts(userId);
            
            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                platform: 'facebook',
                accounts: result.data
            }, 'Instagram accounts retrieved successfully');
        } catch (error) {
            console.error('Get Instagram Accounts Error:', error);
            errorResponse(res, 'Failed to retrieve Instagram accounts');
        }
    }

    // ===========================================
    // CAMPAIGN MANAGEMENT
    // ===========================================

    // Get campaigns
    static async getCampaigns(req, res) {
        try {
            const { platform, accountId } = req.params;
            const { status, campaignType, objective } = req.query;
            const userId = req.user.id;

            const validatedPlatform = AdsManagerFactory.validatePlatform(platform);
            const adsManager = AdsManagerFactory.createManager(validatedPlatform);
            
            const filters = {};
            if (status) filters.status = status;
            if (campaignType) filters.campaignType = campaignType;
            if (objective) filters.objective = objective;

            const result = await adsManager.getCampaigns(userId, accountId, filters);
            
            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                platform: validatedPlatform,
                accountId,
                campaigns: result.data
            }, 'Campaigns retrieved successfully');
        } catch (error) {
            console.error('Get Campaigns Error:', error);
            errorResponse(res, 'Failed to retrieve campaigns');
        }
    }

    // Create campaign
    static async createCampaign(req, res) {
        try {
            const { platform, accountId } = req.params;
            const campaignData = req.body;
            const userId = req.user.id;

            const validatedPlatform = AdsManagerFactory.validatePlatform(platform);
            const adsManager = AdsManagerFactory.createManager(validatedPlatform);
            
            const result = await adsManager.createCampaign(userId, accountId, campaignData);
            
            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                platform: validatedPlatform,
                accountId,
                campaign: result.data
            }, 'Campaign created successfully');
        } catch (error) {
            console.error('Create Campaign Error:', error);
            errorResponse(res, 'Failed to create campaign');
        }
    }

    // Update campaign
    static async updateCampaign(req, res) {
        try {
            const { platform, accountId, campaignId } = req.params;
            const updates = req.body;
            const userId = req.user.id;

            const validatedPlatform = AdsManagerFactory.validatePlatform(platform);
            const adsManager = AdsManagerFactory.createManager(validatedPlatform);
            
            let result;
            if (validatedPlatform === 'youtube' || validatedPlatform === 'google') {
                result = await adsManager.updateCampaign(userId, accountId, campaignId, updates);
            } else {
                result = await adsManager.updateCampaign(userId, campaignId, updates);
            }
            
            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                platform: validatedPlatform,
                accountId,
                campaignId,
                campaign: result.data
            }, 'Campaign updated successfully');
        } catch (error) {
            console.error('Update Campaign Error:', error);
            errorResponse(res, 'Failed to update campaign');
        }
    }

    // ===========================================
    // AD SET/AD GROUP MANAGEMENT
    // ===========================================

    // Get ad sets/ad groups
    static async getAdSets(req, res) {
        try {
            const { platform, accountId } = req.params;
            const { campaignId } = req.query;
            const userId = req.user.id;

            const validatedPlatform = AdsManagerFactory.validatePlatform(platform);
            const adsManager = AdsManagerFactory.createManager(validatedPlatform);
            
            let result;
            if (validatedPlatform === 'youtube') {
                result = await adsManager.getAdGroups(userId, accountId, campaignId);
            } else {
                result = await adsManager.getAdSets(userId, accountId, campaignId);
            }
            
            if (!result.success) {
                return errorResponse(res, result.error);
            }

            const entityName = validatedPlatform === 'youtube' ? 'Ad groups' : 'Ad sets';
            const dataKey = validatedPlatform === 'youtube' ? 'adGroups' : 'adSets';

            successResponse(res, {
                platform: validatedPlatform,
                accountId,
                ...(campaignId && { campaignId }),
                [dataKey]: result.data
            }, `${entityName} retrieved successfully`);
        } catch (error) {
            console.error('Get Ad Sets Error:', error);
            errorResponse(res, 'Failed to retrieve ad sets');
        }
    }

    // Create ad set/ad group
    static async createAdSet(req, res) {
        try {
            const { platform, accountId, campaignId } = req.params;
            const adSetData = req.body;
            const userId = req.user.id;

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
                return errorResponse(res, result.error);
            }

            const entityName = validatedPlatform === 'youtube' ? 'Ad group' : 'Ad set';
            
            successResponse(res, {
                platform: validatedPlatform,
                accountId,
                campaignId,
                [validatedPlatform === 'youtube' ? 'adGroup' : 'adSet']: result.data
            }, `${entityName} created successfully`);
        } catch (error) {
            console.error('Create Ad Set Error:', error);
            errorResponse(res, 'Failed to create ad set');
        }
    }

    // ===========================================
    // AD MANAGEMENT
    // ===========================================

    // Get ads
    static async getAds(req, res) {
        try {
            const { platform, accountId } = req.params;
            const { adSetId } = req.query;
            const userId = req.user.id;

            const validatedPlatform = AdsManagerFactory.validatePlatform(platform);
            const adsManager = AdsManagerFactory.createManager(validatedPlatform);
            
            const result = await adsManager.getAds(userId, accountId, adSetId);
            
            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                platform: validatedPlatform,
                accountId,
                ...(adSetId && { adSetId }),
                ads: result.data
            }, 'Ads retrieved successfully');
        } catch (error) {
            console.error('Get Ads Error:', error);
            errorResponse(res, 'Failed to retrieve ads');
        }
    }

    // Create ad
    static async createAd(req, res) {
        try {
            const { platform, accountId, adSetId } = req.params;
            const adData = req.body;
            const userId = req.user.id;

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
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                platform: validatedPlatform,
                accountId,
                adSetId,
                ad: result.data
            }, 'Ad created successfully');
        } catch (error) {
            console.error('Create Ad Error:', error);
            errorResponse(res, 'Failed to create ad');
        }
    }

    // ===========================================
    // CREATIVE MANAGEMENT (Facebook specific)
    // ===========================================

    // Get ad creatives
    static async getAdCreatives(req, res) {
        try {
            const { accountId } = req.params;
            const userId = req.user.id;

            const adsManager = AdsManagerFactory.createManager('facebook');
            const result = await adsManager.getAdCreatives(userId, accountId);
            
            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                platform: 'facebook',
                accountId,
                creatives: result.data
            }, 'Ad creatives retrieved successfully');
        } catch (error) {
            console.error('Get Ad Creatives Error:', error);
            errorResponse(res, 'Failed to retrieve ad creatives');
        }
    }

    // Create ad creative
    static async createAdCreative(req, res) {
        try {
            const { accountId } = req.params;
            const creativeData = req.body;
            const userId = req.user.id;

            const adsManager = AdsManagerFactory.createManager('facebook');
            const result = await adsManager.createAdCreative(userId, accountId, creativeData);
            
            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                platform: 'facebook',
                accountId,
                creative: result.data
            }, 'Ad creative created successfully');
        } catch (error) {
            console.error('Create Ad Creative Error:', error);
            errorResponse(res, 'Failed to create ad creative');
        }
    }

    // Upload image
    static async uploadImage(req, res) {
        try {
            const { accountId } = req.params;
            const imageData = req.body;
            const userId = req.user.id;

            const adsManager = AdsManagerFactory.createManager('facebook');
            const result = await adsManager.uploadImage(userId, accountId, imageData);
            
            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                platform: 'facebook',
                accountId,
                image: result.data
            }, 'Image uploaded successfully');
        } catch (error) {
            console.error('Upload Image Error:', error);
            errorResponse(res, 'Failed to upload image');
        }
    }

    // ===========================================
    // YOUTUBE SPECIFIC METHODS
    // ===========================================

    // Create Bumper Ad
    static async createBumperAd(req, res) {
        try {
            const { accountId, adSetId } = req.params;
            const adData = req.body;
            const userId = req.user.id;

            const adsManager = AdsManagerFactory.createManager('youtube');
            adData.adGroupId = adSetId;
            
            const result = await adsManager.createBumperAd(userId, accountId, adData);
            
            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                platform: 'youtube',
                accountId,
                adSetId,
                ad: result.data
            }, 'Bumper ad created successfully');
        } catch (error) {
            console.error('Create Bumper Ad Error:', error);
            errorResponse(res, 'Failed to create bumper ad');
        }
    }

    // Add channel targeting
    static async addChannelTargeting(req, res) {
        try {
            const { accountId, adGroupId } = req.params;
            const { channelIds } = req.body;
            const userId = req.user.id;

            const adsManager = AdsManagerFactory.createManager('youtube');
            const result = await adsManager.addChannelTargeting(userId, accountId, adGroupId, channelIds);
            
            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                platform: 'youtube',
                accountId,
                adGroupId,
                targeting: result.data
            }, 'Channel targeting added successfully');
        } catch (error) {
            console.error('Add Channel Targeting Error:', error);
            errorResponse(res, 'Failed to add channel targeting');
        }
    }

    // Upload video asset
    static async uploadVideoAsset(req, res) {
        try {
            const { accountId } = req.params;
            const assetData = req.body;
            const userId = req.user.id;

            const adsManager = AdsManagerFactory.createManager('youtube');
            const result = await adsManager.uploadVideoAsset(userId, accountId, assetData);
            
            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                platform: 'youtube',
                accountId,
                asset: result.data
            }, 'Video asset uploaded successfully');
        } catch (error) {
            console.error('Upload Video Asset Error:', error);
            errorResponse(res, 'Failed to upload video asset');
        }
    }

    // Get video performance report
    static async getVideoPerformanceReport(req, res) {
        try {
            const { accountId } = req.params;
            const { startDate, endDate } = req.query;
            const userId = req.user.id;

            const adsManager = AdsManagerFactory.createManager('youtube');
            const dateRange = { start: startDate, end: endDate };
            
            const result = await adsManager.getVideoPerformanceReport(userId, accountId, dateRange);
            
            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                platform: 'youtube',
                accountId,
                dateRange,
                report: result.data
            }, 'Video performance report retrieved successfully');
        } catch (error) {
            console.error('Get Video Performance Report Error:', error);
            errorResponse(res, 'Failed to retrieve video performance report');
        }
    }

    // Get channel analytics
    static async getChannelAnalytics(req, res) {
        try {
            const { channelId } = req.params;
            const { startDate, endDate } = req.query;
            const userId = req.user.id;

            const adsManager = AdsManagerFactory.createManager('youtube');
            const result = await adsManager.getChannelAnalytics(userId, channelId, startDate, endDate);
            
            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                platform: 'youtube',
                channelId,
                dateRange: { startDate, endDate },
                analytics: result.data
            }, 'Channel analytics retrieved successfully');
        } catch (error) {
            console.error('Get Channel Analytics Error:', error);
            errorResponse(res, 'Failed to retrieve channel analytics');
        }
    }

    // ===========================================
    // TARGETING HELPERS (Facebook specific)
    // ===========================================

    // Get targeting options
    static async getTargetingOptions(req, res) {
        try {
            const { type } = req.params;
            const { query = '' } = req.query;
            const userId = req.user.id;

            const adsManager = AdsManagerFactory.createManager('facebook');
            const result = await adsManager.getTargetingOptions(userId, type, query);
            
            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                platform: 'facebook',
                type,
                options: result.data
            }, 'Targeting options retrieved successfully');
        } catch (error) {
            console.error('Get Targeting Options Error:', error);
            errorResponse(res, 'Failed to retrieve targeting options');
        }
    }

    // Get delivery estimate
    static async getDeliveryEstimate(req, res) {
        try {
            const { accountId } = req.params;
            const { targeting, optimizationGoal } = req.body;
            const userId = req.user.id;

            const adsManager = AdsManagerFactory.createManager('facebook');
            const result = await adsManager.getDeliveryEstimate(userId, accountId, targeting, optimizationGoal);
            
            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                platform: 'facebook',
                accountId,
                estimate: result.data
            }, 'Delivery estimate retrieved successfully');
        } catch (error) {
            console.error('Get Delivery Estimate Error:', error);
            errorResponse(res, 'Failed to retrieve delivery estimate');
        }
    }

    // ===========================================
    // REPORTING & ANALYTICS
    // ===========================================

    // Get insights/reports
    static async getInsights(req, res) {
        try {
            const { platform, accountId, objectId } = req.params;
            const { 
                level = 'campaign', 
                datePreset = 'last_30d', 
                startDate, 
                endDate, 
                fields 
            } = req.query;
            const userId = req.user.id;

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
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                platform: validatedPlatform,
                accountId,
                objectId,
                level,
                dateRange: startDate && endDate ? { startDate, endDate } : { preset: datePreset },
                insights: result.data
            }, 'Insights retrieved successfully');
        } catch (error) {
            console.error('Get Insights Error:', error);
            errorResponse(res, 'Failed to retrieve insights');
        }
    }

    // ===========================================
    // BULK OPERATIONS
    // ===========================================

    // Bulk update campaign status
    static async bulkUpdateCampaignStatus(req, res) {
        try {
            const { platform, accountId } = req.params;
            const { campaignIds, status } = req.body;
            const userId = req.user.id;

            const validatedPlatform = AdsManagerFactory.validatePlatform(platform);
            const adsManager = AdsManagerFactory.createManager(validatedPlatform);
            
            let result;
            if (validatedPlatform === 'youtube') {
                result = await adsManager.bulkUpdateCampaignStatus(userId, accountId, campaignIds, status);
            } else {
                result = await adsManager.bulkUpdateCampaignStatus(userId, campaignIds, status);
            }
            
            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                platform: validatedPlatform,
                accountId,
                updatedCampaigns: result.data
            }, 'Campaign statuses updated successfully');
        } catch (error) {
            console.error('Bulk Update Campaign Status Error:', error);
            errorResponse(res, 'Failed to update campaign statuses');
        }
    }

    // ===========================================
    // UTILITY METHODS
    // ===========================================

    // Get supported platforms
    static async getSupportedPlatforms(req, res) {
        try {
            const platforms = AdsManagerFactory.getSupportedPlatforms();
            
            successResponse(res, {
                platforms,
                count: platforms.length
            }, 'Supported platforms retrieved successfully');
        } catch (error) {
            console.error('Get Supported Platforms Error:', error);
            errorResponse(res, 'Failed to retrieve supported platforms');
        }
    }

    // Health check for platform connectivity
    static async checkPlatformHealth(req, res) {
        try {
            const { platform } = req.params;
            const userId = req.user.id;

            const validatedPlatform = AdsManagerFactory.validatePlatform(platform);
            const adsManager = AdsManagerFactory.createManager(validatedPlatform);
            
            // Try to get ad accounts as a health check
            const result = await adsManager.getAdAccounts(userId);
            
            successResponse(res, {
                platform: validatedPlatform,
                healthy: result.success,
                status: result.success ? 'connected' : 'error',
                ...(result.error && { error: result.error })
            }, `${validatedPlatform} platform health check completed`);
        } catch (error) {
            console.error('Check Platform Health Error:', error);
            successResponse(res, {
                platform: req.params.platform,
                healthy: false,
                status: 'error',
                error: error.message
            }, 'Platform health check completed with errors');
        }
    }
}

module.exports = AdsController;