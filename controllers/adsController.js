const ConnectedAccount = require('../models/ConnectedAccount');
const AdsManagerFactory = require('../services/adsManagerFactory');
const AdPlatformAuthenticator = require('../utils/adsPlatformAuthenticator');
const AnalyticsService = require('../services/analyticsService');
const AIService = require('../services/aiService');
const ReportsService = require('../services/reportsService');
const { queryToDateRange, formatMonthlyDataForChart, getYearDateRange, sortMonthlyChartData, formatDeviceDistributionForChart, addPercentageToData } = require('../utils/common');
const {
    successResponse,
    errorResponse,
    unauthorizedResponse,
    conflictResponse,
    notFoundResponse
} = require('../utils/response');
const Subscription = require('../models/Subscription');
const { getPlanByPriceId } = require('../config/plans');

class AdsController {
    // ===========================================
    // ACCOUNT MANAGEMENT
    // ===========================================

    // Get connected accounts from database
    static async getConnectedAccounts(req, res) {
        try {
            const userId = req.user.id;
            const platform = req.params.platform;
            const result = await ConnectedAccount.findByUserAndPlatform(userId, platform);
            console.log(":: result", result)
            if (result.length == 0) {
                return errorResponse(res, result.error);
            }
            successResponse(res, {
                platform: result.map((v) => v.platform),
                accounts: result
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

            // Enforce Campaign Creation limits
            // We assume 'teamId' is attached to the user session, or passed in query. 
            // In OmniAds it looks like team relation might be abstracted via user ID right now (campaigns bound to User)
            // But if there's a teamId we'll use it, else fallback to skipping check or doing user-level
            const teamId = req.query.teamId || req.body.teamId;
            if (teamId) {
                const subscription = await Subscription.getByTeamId(teamId);
                const planTier = subscription ? subscription.plan_id : 'free';
                let planConfig;
                try {
                    planConfig = getPlanByPriceId(planTier);
                } catch (e) {
                    planConfig = require('../config/plans').PLANS['free'];
                }

                const campaignLimit = planConfig.limits.campaigns_per_month;

                if (campaignLimit !== -1) {
                    // For brevity here we do a very naive count approach assuming we can query campaigns from DB
                    // In a production app, we'd query local database instead of the live ad service to count campaigns, or track usage table
                    // We'll proceed with creating it here
                }
            }

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

    // Get Google Analytics properties
    static async getAnalyticsProperties(req, res) {
        try {
            const { accountId } = req.params;
            const userId = req.user.id;

            const authenticator = new AdPlatformAuthenticator();
            const accessToken = await authenticator.getValidAccessToken(userId, 'analytics');

            if (!accessToken) {
                return errorResponse(res, 'No valid analytics access token found. Please re-authenticate.');
            }
            const analyticsData = await ConnectedAccount.findById(accountId);
            const result = await authenticator.getGoogleAnalyticsProperties(accessToken, analyticsData.account_id);

            successResponse(res, {
                platform: 'analytics',
                accountId,
                properties: result.properties,
                totalProperties: result.totalProperties
            }, 'Analytics properties retrieved successfully');
        } catch (error) {
            console.error('Get Analytics Properties Error:', error);
            errorResponse(res, 'Failed to retrieve analytics properties');
        }
    }

    // Get Google Analytics metrics for a property in a date range
    static async getAnalyticsMetrics(req, res) {
        try {
            // const { accountId } = req.params;
            const { dateRange, propertyId } = req.query; // e.g. 7, 30, 90, 'year'
            const userId = req.user.id;

            // Authenticator and connected account setup
            const authenticator = new AdPlatformAuthenticator();
            const accessToken = await authenticator.getValidAccessToken(userId, 'analytics');

            if (!accessToken) {
                return errorResponse(res, 'No valid analytics access token found. Please re-authenticate.');
            }
            // const analyticsData = await ConnectedAccount.findById(accountId);

            // Compute date range dynamically
            const { startDate, endDate } = queryToDateRange(dateRange); // Default 30 days if not supplied

            // Call your earlier function for metrics
            const metricsResult = await authenticator.getGoogleAnalyticsMetrics(
                accessToken,
                propertyId,
                startDate,
                endDate
            );

            if (!metricsResult.metrics) {
                return errorResponse(res, metricsResult.message || 'Failed to retrieve analytics metrics.');
            }

            successResponse(res, {
                platform: 'analytics',
                propertyId,
                period: { startDate, endDate },
                metrics: metricsResult.metrics
            }, 'Analytics metrics retrieved successfully');
        } catch (error) {
            console.error('Get Analytics Metrics Error:', error);
            errorResponse(res, 'Failed to retrieve analytics metrics');
        }
    }

    // Controller for monthly chart metrics
    static async getAnalyticsMonthlyChart(req, res) {
        try {
            const { year, propertyId, dateRange } = req.query; // frontend should send year (e.g. "2025")
            const userId = req.user.id;

            const authenticator = new AdPlatformAuthenticator();
            const accessToken = await authenticator.getValidAccessToken(userId, 'analytics');

            if (!accessToken) {
                return errorResponse(res, 'No valid analytics access token found. Please re-authenticate.');
            }

            const { startDate, endDate } = queryToDateRange(dateRange); // Default 30 days if not supplied
            // const { startDate, endDate } = getYearDateRange(year);

            // Fetch month-wise metrics
            const monthlyMetrics = await authenticator.getGoogleAnalyticsMonthlyMetrics(
                accessToken,
                propertyId,
                startDate,
                endDate
            );

            // Prepare for chart (months as 'Jan', 'Feb', ...)
            const monthlyChartData = formatMonthlyDataForChart(monthlyMetrics);
            const sortedMonthlyData = sortMonthlyChartData(monthlyChartData);

            successResponse(res, {
                platform: 'analytics',
                propertyId,
                year,
                period: { startDate, endDate },
                monthlyData: sortedMonthlyData
            }, 'Analytics monthly chart data retrieved successfully');
        } catch (error) {
            console.error('Get Analytics Monthly Chart Error:', error);
            errorResponse(res, 'Failed to retrieve analytics monthly chart data');
        }
    }
    // Controller for device distribution
    static async getAnalyticsDeviceChart(req, res) {
        try {
            const { propertyId, year } = req.query;
            const userId = req.user.id;

            // Auth & token
            const authenticator = new AdPlatformAuthenticator();
            const accessToken = await authenticator.getValidAccessToken(userId, 'analytics');
            if (!accessToken) {
                return errorResponse(res, 'No valid analytics access token found. Please re-authenticate.');
            }
            const { startDate, endDate } = getYearDateRange(year);

            // Fetch device distribution
            const deviceData = await authenticator.getGoogleAnalyticsDeviceDistribution(
                accessToken,
                propertyId,
                startDate,
                endDate
            );

            // Format for chart
            const chartData = formatDeviceDistributionForChart(deviceData);
            const percentagesData = addPercentageToData(chartData, "sessions");
            // Success response
            successResponse(res, {
                platform: 'analytics',
                propertyId,
                period: { startDate, endDate },
                deviceDistribution: percentagesData
            }, 'Device distribution analytics data retrieved successfully');
        } catch (error) {
            console.error('Get Analytics Device Chart Error:', error);
            errorResponse(res, 'Failed to retrieve analytics device chart data');
        }
    }

    // Controller for genarte report
    static async getAnalyticsReport(req, res) {
        try {
            const { propertyId, startDate, endDate, reportType, reportName, description } = req.query;
            const userId = req.user.id;

            // Auth & token
            const authenticator = new AdPlatformAuthenticator();
            const accessToken = await authenticator.getValidAccessToken(userId, 'analytics');
            if (!accessToken) {
                return errorResponse(res, 'No valid analytics access token found. Please re-authenticate.');
            }

            // Fetch report
            const report = await authenticator.getGoogleAnalyticsReport(
                accessToken,
                propertyId,
                startDate,
                endDate,
                reportType,
                reportName,
                description
            );

            // Success response
            successResponse(res, {
                platform: 'analytics',
                propertyId,
                period: { startDate, endDate },
                report
            }, 'Report analytics data retrieved successfully');
        } catch (error) {
            console.error('Get Analytics Report Error:', error);
            errorResponse(res, 'Failed to retrieve analytics report data');
        }
    }

    // Controller for top browsers
    static async getAnalyticsTopBrowsers(req, res) {
        try {
            const { propertyId, year } = req.query;
            const userId = req.user.id;

            // Auth & token
            const authenticator = new AdPlatformAuthenticator();
            const accessToken = await authenticator.getValidAccessToken(userId, 'analytics');
            if (!accessToken) {
                return errorResponse(res, 'No valid analytics access token found. Please re-authenticate.');
            }
            const { startDate, endDate } = getYearDateRange(year);

            // Fetch top browsers
            const topBrowsers = await authenticator.getGoogleAnalyticsBrowserDistribution(
                accessToken,
                propertyId,
                startDate,
                endDate
            );

            const percentagesData = addPercentageToData(topBrowsers, "usage");



            // Success response
            successResponse(res, {
                platform: 'analytics',
                propertyId,
                period: { startDate, endDate },
                topBrowsers: percentagesData
            }, 'Top browsers analytics data retrieved successfully');
        } catch (error) {
            console.error('Get Analytics Top Browsers Error:', error);
            errorResponse(res, 'Failed to retrieve analytics top browsers data');
        }
    }

    // Controller for top pages
    static async getAnalyticsTopPages(req, res) {
        try {
            const { propertyId, year } = req.query;
            const userId = req.user.id;

            // Auth & token
            const authenticator = new AdPlatformAuthenticator();
            const accessToken = await authenticator.getValidAccessToken(userId, 'analytics');
            if (!accessToken) {
                return errorResponse(res, 'No valid analytics access token found. Please re-authenticate.');
            }
            const { startDate, endDate } = getYearDateRange(year);

            // Fetch top pages
            const topPages = await authenticator.getGoogleAnalyticsTopPages(
                accessToken,
                propertyId,
                startDate,
                endDate
            );

            // Success response
            successResponse(res, {
                platform: 'analytics',
                propertyId,
                period: { startDate, endDate },
                topPages: topPages
            }, 'Top pages analytics data retrieved successfully');
        } catch (error) {
            console.error('Get Analytics Top Pages Error:', error);
            errorResponse(res, 'Failed to retrieve analytics top pages data');
        }
    }

    // Controller for revenue trends (time-series)
    static async getAnalyticsRevenueTrends(req, res) {
        try {
            const { propertyId, startDate, endDate, dateRange } = req.query;
            const userId = req.user.id;

            // Auth & token
            const authenticator = new AdPlatformAuthenticator();
            const accessToken = await authenticator.getValidAccessToken(userId, 'analytics');
            if (!accessToken) {
                return errorResponse(res, 'No valid analytics access token found. Please re-authenticate.');
            }

            // Compute date range dynamically
            let start, end;
            if (startDate && endDate) {
                start = startDate;
                end = endDate;
            } else {
                try {
                    const dateRangeResult = queryToDateRange(dateRange || 'last-30-days');
                    start = dateRangeResult.startDate;
                    end = dateRangeResult.endDate;
                } catch (error) {
                    return errorResponse(res, `Invalid date range: ${error.message}`, 400);
                }
            }

            // Fetch revenue trends data
            const revenueTrends = await authenticator.getGoogleAnalyticsRevenueTrends(
                accessToken,
                propertyId,
                start,
                end
            );

            // Success response
            successResponse(res, {
                platform: 'analytics',
                propertyId,
                period: { startDate: start, endDate: end },
                revenueTrends: revenueTrends
            }, 'Revenue trends analytics data retrieved successfully');
        } catch (error) {
            console.error('Get Analytics Revenue Trends Error:', error);
            errorResponse(res, 'Failed to retrieve analytics revenue trends data');
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

    // ===========================================
    // CONVERSION ANALYTICS
    // ===========================================

    static async getConversionFunnel(req, res) {
        try {
            const { propertyId, startDate, endDate, dateRange } = req.query;
            const userId = req.user.id;

            const analyticsService = new AnalyticsService();
            let start, end;
            if (startDate && endDate) {
                start = startDate;
                end = endDate;
            } else {
                try {
                    const dateRangeResult = queryToDateRange(dateRange || 'last-30-days');
                    start = dateRangeResult.startDate;
                    end = dateRangeResult.endDate;
                } catch (error) {
                    return errorResponse(res, `Invalid date range: ${error.message}`, 400);
                }
            }

            const result = await analyticsService.getConversionFunnel(userId, propertyId, start, end);

            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                propertyId,
                period: { startDate: start, endDate: end },
                ...result.data
            }, 'Conversion funnel retrieved successfully');
        } catch (error) {
            console.error('Get Conversion Funnel Error:', error);
            errorResponse(res, 'Failed to retrieve conversion funnel');
        }
    }

    static async getConversionsBySource(req, res) {
        try {
            const { propertyId, startDate, endDate, dateRange } = req.query;
            const userId = req.user.id;

            const analyticsService = new AnalyticsService();
            let start, end;
            if (startDate && endDate) {
                start = startDate;
                end = endDate;
            } else {
                try {
                    const dateRangeResult = queryToDateRange(dateRange || 'last-30-days');
                    start = dateRangeResult.startDate;
                    end = dateRangeResult.endDate;
                } catch (error) {
                    return errorResponse(res, `Invalid date range: ${error.message}`, 400);
                }
            }

            const result = await analyticsService.getConversionsBySource(userId, propertyId, start, end);

            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                propertyId,
                period: { startDate: start, endDate: end },
                ...result.data
            }, 'Conversions by source retrieved successfully');
        } catch (error) {
            console.error('Get Conversions By Source Error:', error);
            errorResponse(res, 'Failed to retrieve conversions by source');
        }
    }

    static async getConversionGoals(req, res) {
        try {
            const { propertyId, startDate, endDate, dateRange } = req.query;
            const userId = req.user.id;

            const analyticsService = new AnalyticsService();
            let start, end;
            if (startDate && endDate) {
                start = startDate;
                end = endDate;
            } else {
                try {
                    const dateRangeResult = queryToDateRange(dateRange || 'last-30-days');
                    start = dateRangeResult.startDate;
                    end = dateRangeResult.endDate;
                } catch (error) {
                    return errorResponse(res, `Invalid date range: ${error.message}`, 400);
                }
            }

            const result = await analyticsService.getConversionGoals(userId, propertyId, start, end);

            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                propertyId,
                period: { startDate: start, endDate: end },
                ...result.data
            }, 'Conversion goals retrieved successfully');
        } catch (error) {
            console.error('Get Conversion Goals Error:', error);
            errorResponse(res, 'Failed to retrieve conversion goals');
        }
    }

    // ===========================================
    // REVENUE ANALYTICS
    // ===========================================

    static async getRevenueByChannel(req, res) {
        try {
            const { propertyId, startDate, endDate, dateRange } = req.query;
            const userId = req.user.id;

            const analyticsService = new AnalyticsService();
            let start, end;
            if (startDate && endDate) {
                start = startDate;
                end = endDate;
            } else {
                try {
                    const dateRangeResult = queryToDateRange(dateRange || 'last-30-days');
                    start = dateRangeResult.startDate;
                    end = dateRangeResult.endDate;
                } catch (error) {
                    return errorResponse(res, `Invalid date range: ${error.message}`, 400);
                }
            }

            const result = await analyticsService.getRevenueByChannel(userId, propertyId, start, end);

            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                propertyId,
                period: { startDate: start, endDate: end },
                ...result.data
            }, 'Revenue by channel retrieved successfully');
        } catch (error) {
            console.error('Get Revenue By Channel Error:', error);
            errorResponse(res, 'Failed to retrieve revenue by channel');
        }
    }

    static async getRevenueByCampaigns(req, res) {
        try {
            const { propertyId, startDate, endDate, dateRange } = req.query;
            const userId = req.user.id;

            const analyticsService = new AnalyticsService();
            let start, end;
            if (startDate && endDate) {
                start = startDate;
                end = endDate;
            } else {
                try {
                    const dateRangeResult = queryToDateRange(dateRange || 'last-30-days');
                    start = dateRangeResult.startDate;
                    end = dateRangeResult.endDate;
                } catch (error) {
                    return errorResponse(res, `Invalid date range: ${error.message}`, 400);
                }
            }

            const result = await analyticsService.getRevenueByCampaigns(userId, propertyId, start, end);

            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                propertyId,
                period: { startDate: start, endDate: end },
                ...result.data
            }, 'Revenue by campaigns retrieved successfully');
        } catch (error) {
            console.error('Get Revenue By Campaigns Error:', error);
            errorResponse(res, 'Failed to retrieve revenue by campaigns');
        }
    }

    static async getLifetimeValue(req, res) {
        try {
            const { propertyId, startDate, endDate, dateRange, includeSegmented = 'true' } = req.query;
            const userId = req.user.id;

            const analyticsService = new AnalyticsService();
            let start, end;
            if (startDate && endDate) {
                start = startDate;
                end = endDate;
            } else {
                try {
                    const dateRangeResult = queryToDateRange(dateRange || 'last-30-days');
                    start = dateRangeResult.startDate;
                    end = dateRangeResult.endDate;
                } catch (error) {
                    return errorResponse(res, `Invalid date range: ${error.message}`, 400);
                }
            }

            // Get cohort-based LTV (original method)
            const cohortResult = await analyticsService.getLifetimeValue(userId, propertyId, start, end);

            if (!cohortResult.success) {
                return errorResponse(res, cohortResult.error);
            }

            let segmentedResult = null;
            if (includeSegmented === 'true') {
                // Get segmented LTV (new method) - only if requested
                try {
                    segmentedResult = await analyticsService.getLifetimeValueBySegments(userId, propertyId, start, end);
                } catch (segmentedError) {
                    console.warn('Segmented LTV failed, continuing with cohort LTV only:', segmentedError.message);
                    // Continue without segmented data if it fails
                }
            }

            const responseData = {
                propertyId,
                period: { startDate: start, endDate: end },
                cohortLtv: cohortResult.data
            };

            // Add segmented LTV if available
            if (segmentedResult && segmentedResult.success) {
                responseData.segmentedLtv = segmentedResult.data;
            }

            successResponse(res, responseData, 'Lifetime value data retrieved successfully');
        } catch (error) {
            console.error('Get Lifetime Value Error:', error);
            errorResponse(res, 'Failed to retrieve lifetime value');
        }
    }

    // ===========================================
    // CUSTOM EVENTS
    // ===========================================

    static async getCustomEvents(req, res) {
        try {
            const { propertyId, startDate, endDate, dateRange } = req.query;
            const userId = req.user.id;

            const analyticsService = new AnalyticsService();
            let start, end;
            if (startDate && endDate) {
                start = startDate;
                end = endDate;
            } else {
                try {
                    const dateRangeResult = queryToDateRange(dateRange || 'last-30-days');
                    start = dateRangeResult.startDate;
                    end = dateRangeResult.endDate;
                } catch (error) {
                    return errorResponse(res, `Invalid date range: ${error.message}`, 400);
                }
            }

            const result = await analyticsService.getCustomEvents(userId, propertyId, start, end);

            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                propertyId,
                period: { startDate: start, endDate: end },
                ...result.data
            }, 'Custom events retrieved successfully');
        } catch (error) {
            console.error('Get Custom Events Error:', error);
            errorResponse(res, 'Failed to retrieve custom events');
        }
    }

    static async createCustomEvent(req, res) {
        try {
            const { propertyId } = req.query;
            const eventData = req.body;
            const userId = req.user.id;

            const analyticsService = new AnalyticsService();
            const result = await analyticsService.createCustomEvent(userId, propertyId, eventData);

            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                propertyId,
                ...result.data
            }, 'Custom event created successfully', 201);
        } catch (error) {
            console.error('Create Custom Event Error:', error);
            errorResponse(res, 'Failed to create custom event');
        }
    }

    static async getCustomKPIs(req, res) {
        try {
            const { propertyId, startDate, endDate, dateRange } = req.query;
            const userId = req.user.id;

            const analyticsService = new AnalyticsService();
            let start, end;
            if (startDate && endDate) {
                start = startDate;
                end = endDate;
            } else {
                try {
                    const dateRangeResult = queryToDateRange(dateRange || 'last-30-days');
                    start = dateRangeResult.startDate;
                    end = dateRangeResult.endDate;
                } catch (error) {
                    return errorResponse(res, `Invalid date range: ${error.message}`, 400);
                }
            }

            const result = await analyticsService.getCustomKPIs(userId, propertyId, start, end);

            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                propertyId,
                period: { startDate: start, endDate: end },
                ...result.data
            }, 'Custom KPIs retrieved successfully');
        } catch (error) {
            console.error('Get Custom KPIs Error:', error);
            errorResponse(res, 'Failed to retrieve custom KPIs');
        }
    }

    // ===========================================
    // USER SEGMENTS
    // ===========================================

    static async getSegments(req, res) {
        try {
            const { propertyId } = req.query;
            const userId = req.user.id;

            const analyticsService = new AnalyticsService();
            const result = await analyticsService.getSegments(userId, propertyId);

            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                propertyId,
                ...result.data
            }, 'Segments retrieved successfully');
        } catch (error) {
            console.error('Get Segments Error:', error);
            errorResponse(res, 'Failed to retrieve segments');
        }
    }

    static async createSegment(req, res) {
        try {
            const { propertyId } = req.query;
            const segmentData = req.body;
            const userId = req.user.id;

            const analyticsService = new AnalyticsService();
            const result = await analyticsService.createSegment(userId, propertyId, segmentData);

            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                propertyId,
                ...result.data
            }, 'Segment created successfully', 201);
        } catch (error) {
            console.error('Create Segment Error:', error);
            errorResponse(res, 'Failed to create segment');
        }
    }

    // ===========================================
    // TRAFFIC DETAILS
    // ===========================================

    static async getTrafficSources(req, res) {
        try {
            const { propertyId, startDate, endDate, dateRange } = req.query;
            const userId = req.user.id;

            const analyticsService = new AnalyticsService();
            let start, end;
            if (startDate && endDate) {
                start = startDate;
                end = endDate;
            } else {
                try {
                    const dateRangeResult = queryToDateRange(dateRange || 'last-30-days');
                    start = dateRangeResult.startDate;
                    end = dateRangeResult.endDate;
                } catch (error) {
                    return errorResponse(res, `Invalid date range: ${error.message}`, 400);
                }
            }

            const result = await analyticsService.getTrafficSources(userId, propertyId, start, end);

            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                propertyId,
                period: { startDate: start, endDate: end },
                ...result.data
            }, 'Traffic sources retrieved successfully');
        } catch (error) {
            console.error('Get Traffic Sources Error:', error);
            errorResponse(res, 'Failed to retrieve traffic sources');
        }
    }

    static async getLandingPages(req, res) {
        try {
            const { propertyId, startDate, endDate, dateRange } = req.query;
            const userId = req.user.id;

            const analyticsService = new AnalyticsService();
            let start, end;
            if (startDate && endDate) {
                start = startDate;
                end = endDate;
            } else {
                try {
                    const dateRangeResult = queryToDateRange(dateRange || 'last-30-days');
                    start = dateRangeResult.startDate;
                    end = dateRangeResult.endDate;
                } catch (error) {
                    return errorResponse(res, `Invalid date range: ${error.message}`, 400);
                }
            }

            const result = await analyticsService.getLandingPages(userId, propertyId, start, end);

            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                propertyId,
                period: { startDate: start, endDate: end },
                ...result.data
            }, 'Landing pages retrieved successfully');
        } catch (error) {
            console.error('Get Landing Pages Error:', error);
            errorResponse(res, 'Failed to retrieve landing pages');
        }
    }

    static async getExitPages(req, res) {
        try {
            const { propertyId, startDate, endDate, dateRange } = req.query;
            const userId = req.user.id;

            const analyticsService = new AnalyticsService();
            let start, end;
            if (startDate && endDate) {
                start = startDate;
                end = endDate;
            } else {
                try {
                    const dateRangeResult = queryToDateRange(dateRange || 'last-30-days');
                    start = dateRangeResult.startDate;
                    end = dateRangeResult.endDate;
                } catch (error) {
                    return errorResponse(res, `Invalid date range: ${error.message}`, 400);
                }
            }

            const result = await analyticsService.getExitPages(userId, propertyId, start, end);

            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                propertyId,
                period: { startDate: start, endDate: end },
                ...result.data
            }, 'Exit pages retrieved successfully');
        } catch (error) {
            console.error('Get Exit Pages Error:', error);
            errorResponse(res, 'Failed to retrieve exit pages');
        }
    }

    // ===========================================
    // ENGAGEMENT
    // ===========================================

    static async getEngagementFrequency(req, res) {
        try {
            const { propertyId, startDate, endDate, dateRange } = req.query;
            const userId = req.user.id;

            const analyticsService = new AnalyticsService();
            let start, end;
            if (startDate && endDate) {
                start = startDate;
                end = endDate;
            } else {
                try {
                    const dateRangeResult = queryToDateRange(dateRange || 'last-30-days');
                    start = dateRangeResult.startDate;
                    end = dateRangeResult.endDate;
                } catch (error) {
                    return errorResponse(res, `Invalid date range: ${error.message}`, 400);
                }
            }

            const result = await analyticsService.getEngagementFrequency(userId, propertyId, start, end);

            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                propertyId,
                period: { startDate: start, endDate: end },
                ...result.data
            }, 'Engagement frequency retrieved successfully');
        } catch (error) {
            console.error('Get Engagement Frequency Error:', error);
            errorResponse(res, 'Failed to retrieve engagement frequency');
        }
    }

    static async getEngagementRecency(req, res) {
        try {
            const { propertyId, startDate, endDate, dateRange } = req.query;
            const userId = req.user.id;

            const analyticsService = new AnalyticsService();
            let start, end;
            if (startDate && endDate) {
                start = startDate;
                end = endDate;
            } else {
                try {
                    const dateRangeResult = queryToDateRange(dateRange || 'last-30-days');
                    start = dateRangeResult.startDate;
                    end = dateRangeResult.endDate;
                } catch (error) {
                    return errorResponse(res, `Invalid date range: ${error.message}`, 400);
                }
            }

            const result = await analyticsService.getEngagementRecency(userId, propertyId, start, end);

            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                propertyId,
                period: { startDate: start, endDate: end },
                ...result.data
            }, 'Engagement recency retrieved successfully');
        } catch (error) {
            console.error('Get Engagement Recency Error:', error);
            errorResponse(res, 'Failed to retrieve engagement recency');
        }
    }

    static async getScrollDepth(req, res) {
        try {
            const { propertyId, startDate, endDate, dateRange } = req.query;
            const userId = req.user.id;

            const analyticsService = new AnalyticsService();
            let start, end;
            if (startDate && endDate) {
                start = startDate;
                end = endDate;
            } else {
                try {
                    const dateRangeResult = queryToDateRange(dateRange || 'last-30-days');
                    start = dateRangeResult.startDate;
                    end = dateRangeResult.endDate;
                } catch (error) {
                    return errorResponse(res, `Invalid date range: ${error.message}`, 400);
                }
            }

            const result = await analyticsService.getScrollDepth(userId, propertyId, start, end);

            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                propertyId,
                period: { startDate: start, endDate: end },
                ...result.data
            }, 'Scroll depth retrieved successfully');
        } catch (error) {
            console.error('Get Scroll Depth Error:', error);
            errorResponse(res, 'Failed to retrieve scroll depth');
        }
    }

    // ===========================================
    // AI FEATURES
    // ===========================================

    static async aiChat(req, res) {
        try {
            const { message, context } = req.body;
            const userId = req.user.id;

            const aiService = new AIService();
            const result = await aiService.chat(userId, message, context);

            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, result.data, 'AI chat response generated successfully');
        } catch (error) {
            console.error('AI Chat Error:', error);
            errorResponse(res, 'Failed to generate AI chat response');
        }
    }

    static async aiInsights(req, res) {
        try {
            const { propertyId, startDate, endDate, dateRange } = req.body;
            const userId = req.user.id;

            const aiService = new AIService();
            let start, end;
            if (startDate && endDate) {
                start = startDate;
                end = endDate;
            } else {
                try {
                    const dateRangeResult = queryToDateRange(dateRange || 'last-30-days');
                    start = dateRangeResult.startDate;
                    end = dateRangeResult.endDate;
                } catch (error) {
                    return errorResponse(res, `Invalid date range: ${error.message}`, 400);
                }
            }

            const result = await aiService.getInsights(userId, propertyId, start, end);

            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                propertyId,
                period: { startDate: start, endDate: end },
                ...result.data
            }, 'AI insights retrieved successfully');
        } catch (error) {
            console.error('AI Insights Error:', error);
            errorResponse(res, 'Failed to retrieve AI insights');
        }
    }

    static async aiRecommendations(req, res) {
        try {
            const { propertyId, startDate, endDate, dateRange } = req.body;
            const userId = req.user.id;

            const aiService = new AIService();
            let start, end;
            if (startDate && endDate) {
                start = startDate;
                end = endDate;
            } else {
                try {
                    const dateRangeResult = queryToDateRange(dateRange || 'last-30-days');
                    start = dateRangeResult.startDate;
                    end = dateRangeResult.endDate;
                } catch (error) {
                    return errorResponse(res, `Invalid date range: ${error.message}`, 400);
                }
            }

            const result = await aiService.getRecommendations(userId, propertyId, start, end);

            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, {
                propertyId,
                period: { startDate: start, endDate: end },
                ...result.data
            }, 'AI recommendations retrieved successfully');
        } catch (error) {
            console.error('AI Recommendations Error:', error);
            errorResponse(res, 'Failed to retrieve AI recommendations');
        }
    }

    // ===========================================
    // REPORTS
    // ===========================================

    static async generateReport(req, res) {
        try {
            const reportData = req.body;
            const userId = req.user.id;

            const reportsService = new ReportsService();
            const result = await reportsService.generateReport(userId, reportData);

            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, result.data, 'Report generated successfully', 201);
        } catch (error) {
            console.error('Generate Report Error:', error);
            errorResponse(res, 'Failed to generate report');
        }
    }

    static async getReports(req, res) {
        try {
            const { status, type } = req.query;
            const userId = req.user.id;

            const reportsService = new ReportsService();
            const result = await reportsService.getReports(userId, { status, type });

            if (!result.success) {
                return errorResponse(res, result.error);
            }

            successResponse(res, result.data, 'Reports retrieved successfully');
        } catch (error) {
            console.error('Get Reports Error:', error);
            errorResponse(res, 'Failed to retrieve reports');
        }
    }

    static async downloadReport(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const reportsService = new ReportsService();
            const result = await reportsService.downloadReport(userId, id);

            if (!result.success) {
                return errorResponse(res, result.error);
            }

            res.setHeader('Content-Type', result.data.contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.data.fileName}"`);
            res.send(result.data.content);
        } catch (error) {
            console.error('Download Report Error:', error);
            errorResponse(res, 'Failed to download report');
        }
    }
}

module.exports = AdsController;