const ConnectedAccount = require('../models/ConnectedAccount');
const AdsManagerFactory = require('../services/adsManagerFactory');
const AdPlatformAuthenticator = require('../utils/adsPlatformAuthenticator');
const AnalyticsService = require('../services/analyticsService');
const AIService = require('../services/aiService');
const ReportsService = require('../services/reportsService');
const Campaign = require('../models/Campaign');
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


const CampaignController = require('./ads/campaignController');
const FacebookController = require('./ads/facebookController');
const YoutubeController = require('./ads/youtubeController');
const AnalyticsController = require('./ads/analyticsController');
const ReportController = require('./ads/reportController');

class AdsController {
    static getAllCampaignsGeneric = CampaignController.getAllCampaignsGeneric;
    static createCampaignGeneric = CampaignController.createCampaignGeneric;
    static getCampaignGeneric = CampaignController.getCampaignGeneric;
    static updateCampaignGeneric = CampaignController.updateCampaignGeneric;
    static deleteCampaignGeneric = CampaignController.deleteCampaignGeneric;
    static updateCampaignStatusGeneric = CampaignController.updateCampaignStatusGeneric;
    static syncCampaignGeneric = CampaignController.syncCampaignGeneric;
    static getCampaigns = CampaignController.getCampaigns;
    static createCampaign = CampaignController.createCampaign;
    static updateCampaign = CampaignController.updateCampaign;
    static bulkUpdateCampaignStatus = CampaignController.bulkUpdateCampaignStatus;
    static getBusinessAccounts = FacebookController.getBusinessAccounts;
    static getInstagramAccounts = FacebookController.getInstagramAccounts;
    static getAdCreatives = FacebookController.getAdCreatives;
    static createAdCreative = FacebookController.createAdCreative;
    static uploadImage = FacebookController.uploadImage;
    static getTargetingOptions = FacebookController.getTargetingOptions;
    static getDeliveryEstimate = FacebookController.getDeliveryEstimate;
    static getChannels = YoutubeController.getChannels;
    static getChannelVideos = YoutubeController.getChannelVideos;
    static createBumperAd = YoutubeController.createBumperAd;
    static addChannelTargeting = YoutubeController.addChannelTargeting;
    static uploadVideoAsset = YoutubeController.uploadVideoAsset;
    static getVideoPerformanceReport = YoutubeController.getVideoPerformanceReport;
    static getChannelAnalytics = YoutubeController.getChannelAnalytics;
    static generateReport = ReportController.generateReport;
    static getReports = ReportController.getReports;
    static downloadReport = ReportController.downloadReport;
    static exportAnalyticsGeneric = ReportController.exportAnalyticsGeneric;
    static getAnalyticsOverviewGeneric = AnalyticsController.getAnalyticsOverviewGeneric;
    static getDashboardOverviewGeneric = AnalyticsController.getDashboardOverviewGeneric;
    static getConnectedAccounts = AnalyticsController.getConnectedAccounts;
    static getAdAccounts = AnalyticsController.getAdAccounts;
    static getAdSets = AnalyticsController.getAdSets;
    static createAdSet = AnalyticsController.createAdSet;
    static getAds = AnalyticsController.getAds;
    static createAd = AnalyticsController.createAd;
    static getAnalyticsProperties = AnalyticsController.getAnalyticsProperties;
    static getAnalyticsMetrics = AnalyticsController.getAnalyticsMetrics;
    static getAnalyticsMonthlyChart = AnalyticsController.getAnalyticsMonthlyChart;
    static getAnalyticsDeviceChart = AnalyticsController.getAnalyticsDeviceChart;
    static getAnalyticsReport = AnalyticsController.getAnalyticsReport;
    static getAnalyticsTopBrowsers = AnalyticsController.getAnalyticsTopBrowsers;
    static getAnalyticsTopPages = AnalyticsController.getAnalyticsTopPages;
    static getAnalyticsRevenueTrends = AnalyticsController.getAnalyticsRevenueTrends;
    static getInsights = AnalyticsController.getInsights;
    static getSupportedPlatforms = AnalyticsController.getSupportedPlatforms;
    static checkPlatformHealth = AnalyticsController.checkPlatformHealth;
    static getConversionFunnel = AnalyticsController.getConversionFunnel;
    static getConversionsBySource = AnalyticsController.getConversionsBySource;
    static getConversionGoals = AnalyticsController.getConversionGoals;
    static getRevenueByChannel = AnalyticsController.getRevenueByChannel;
    static getRevenueByCampaigns = AnalyticsController.getRevenueByCampaigns;
    static getLifetimeValue = AnalyticsController.getLifetimeValue;
    static getCustomEvents = AnalyticsController.getCustomEvents;
    static createCustomEvent = AnalyticsController.createCustomEvent;
    static getCustomKPIs = AnalyticsController.getCustomKPIs;
    static getSegments = AnalyticsController.getSegments;
    static createSegment = AnalyticsController.createSegment;
    static getTrafficSources = AnalyticsController.getTrafficSources;
    static getLandingPages = AnalyticsController.getLandingPages;
    static getExitPages = AnalyticsController.getExitPages;
    static getEngagementFrequency = AnalyticsController.getEngagementFrequency;
    static getEngagementRecency = AnalyticsController.getEngagementRecency;
    static getScrollDepth = AnalyticsController.getScrollDepth;
    static aiChat = AnalyticsController.aiChat;
    static aiInsights = AnalyticsController.aiInsights;
    static aiRecommendations = AnalyticsController.aiRecommendations;
    static getAnalyticsPerformanceGeneric = AnalyticsController.getAnalyticsPerformanceGeneric;
    static getAnalyticsPlatformsGeneric = AnalyticsController.getAnalyticsPlatformsGeneric;
    static getAnalyticsCompareGeneric = AnalyticsController.getAnalyticsCompareGeneric;
    static getAnalyticsGA4Generic = AnalyticsController.getAnalyticsGA4Generic;
}

module.exports = AdsController;
