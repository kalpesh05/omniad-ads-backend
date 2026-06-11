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


class FacebookController {
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

}

module.exports = FacebookController;
