const ConnectedAccount = require('../../models/ConnectedAccount');
const AdsManagerFactory = require('../../services/adsManagerFactory');
const AdPlatformAuthenticator = require('../../utils/adsPlatformAuthenticator');
const AnalyticsService = require('../../services/analyticsService');
const AIService = require('../../services/aiService');
const ReportsService = require('../../services/reportsService');
const Campaign = require('../../models/Campaign');
const { queryToDateRange, formatMonthlyDataForChart, getYearDateRange, sortMonthlyChartData, formatDeviceDistributionForChart, addPercentageToData } = require('../../utils/common');
const {
    successResponse,
    errorResponse,
    unauthorizedResponse,
    conflictResponse,
    notFoundResponse
} = require('../../utils/response');
const Subscription = require('../../models/Subscription');
const { getPlanByPriceId } = require('../../config/plans');


class YoutubeController {
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

}

module.exports = YoutubeController;
