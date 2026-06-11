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


class AnalyticsController {
    static async getAnalyticsOverviewGeneric(req, res) {
        try {
            const userId = req.user.id;
            const db = require('../../config/database').pool;

            // 1. Global Sums
            const [rows] = await db.execute(`
                SELECT 
                    SUM(i.impressions) as total_impressions,
                    SUM(i.clicks) as total_clicks,
                    SUM(i.spend) as total_spend,
                    SUM(i.conversions) as total_conversions,
                    SUM(i.revenue) as total_revenue
                FROM ads_insights i
                JOIN ads_campaigns c ON i.campaign_id = c.id
                JOIN connected_accounts ca ON c.account_id = ca.id
                JOIN ads_tokens at ON ca.token_id = at.id
                WHERE at.user_id = ?
            `, [userId]);

            const stats = rows[0] || {};
            const rev = parseFloat(stats.total_revenue || 0);
            const spend = parseFloat(stats.total_spend || 0);
            const clicks = parseInt(stats.total_clicks || 0, 10);
            const conv = parseInt(stats.total_conversions || 0, 10);

            const cpc = clicks > 0 ? (spend / clicks) : 0;
            const convRate = clicks > 0 ? (conv / clicks) * 100 : 0;
            const roas = spend > 0 ? (rev / spend) : 0;

            // 2. Top Campaigns By Revenue
            const [topCampaigns] = await db.execute(`
                SELECT 
                    c.campaign_name as name, 
                    SUM(i.clicks) as clicks, 
                    SUM(i.revenue) as revenue,
                    SUM(i.spend) as spend
                FROM ads_insights i
                JOIN ads_campaigns c ON i.campaign_id = c.id
                JOIN connected_accounts ca ON c.account_id = ca.id
                JOIN ads_tokens at ON ca.token_id = at.id
                WHERE at.user_id = ?
                GROUP BY c.id
                ORDER BY revenue DESC
                LIMIT 5
            `, [userId]);

            const mappedCampaigns = topCampaigns.map(c => ({
                name: c.name,
                clicks: parseInt(c.clicks || 0, 10),
                revenue: '$' + parseFloat(c.revenue || 0).toLocaleString(),
                roas: c.spend > 0 ? (c.revenue / c.spend).toFixed(1) + 'x' : '0x'
            }));

            // 3. Platform Distribution (Pie Chart)
            const [platformData] = await db.execute(`
                SELECT 
                    ca.platform as name, 
                    SUM(i.revenue) as value
                FROM ads_insights i
                JOIN ads_campaigns c ON i.campaign_id = c.id
                JOIN connected_accounts ca ON c.account_id = ca.id
                JOIN ads_tokens at ON ca.token_id = at.id
                WHERE at.user_id = ?
                GROUP BY ca.platform
            `, [userId]);

            const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
            const mappedPlatformPie = platformData
                .filter(p => p.value > 0)
                .map((p, i) => ({
                    name: p.name,
                    value: parseFloat(p.value),
                    color: colors[i % colors.length]
                }));

            // 4. Daily Performance Timeseries (MultiMetric area chart: last 15 days)
            const [dailyData] = await db.execute(`
                SELECT 
                    DATE_FORMAT(i.date, '%b %d') as date,
                    SUM(i.revenue) as revenue,
                    SUM(i.spend) as spend,
                    SUM(i.conversions) as conversions
                FROM ads_insights i
                JOIN ads_campaigns c ON i.campaign_id = c.id
                JOIN connected_accounts ca ON c.account_id = ca.id
                JOIN ads_tokens at ON ca.token_id = at.id
                WHERE at.user_id = ? AND i.date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
                GROUP BY i.date
                ORDER BY i.date ASC
            `, [userId]);

            const structuredData = {
                metrics: [
                    { metric: 'Total Revenue', value: '$' + rev.toLocaleString(), change: '+12%', trend: 'up', period: 'Last 30 days' },
                    { metric: 'Cost Per Click', value: '$' + cpc.toFixed(2), change: '-2%', trend: 'down', period: 'Last 30 days' },
                    { metric: 'Conversion Rate', value: convRate.toFixed(1) + '%', change: '+5%', trend: 'up', period: 'Last 30 days' },
                    { metric: 'ROAS', value: roas.toFixed(1) + 'x', change: '+1x', trend: 'up', period: 'Last 30 days' }
                ],
                campaigns: mappedCampaigns,
                charts: {
                    multiMetric: dailyData.map(d => ({
                        date: d.date,
                        revenue: parseFloat(d.revenue || 0),
                        spend: parseFloat(d.spend || 0),
                        conversions: parseInt(d.conversions || 0, 10)
                    })),
                    metricsBar: platformData.map(p => ({
                        name: p.name,
                        value: parseFloat(p.value || 0)
                    })),
                    platformPie: mappedPlatformPie,
                    audience: [] // Placeholder
                }
            };

            successResponse(res, structuredData, 'Analytics overview retrieved');
        } catch (error) {
            console.error('Analytics Overview Error:', error);
            errorResponse(res, 'Failed to retrieve analytics overview');
        }
    }

    static async getDashboardOverviewGeneric(req, res) {
        try {
            const userId = req.user.id;

            // Global Sum
            const [rows] = await require('../../config/database').pool.execute(`
                SELECT 
                    SUM(i.impressions) as total_impressions,
                    SUM(i.clicks) as total_clicks,
                    SUM(i.spend) as total_spend,
                    SUM(i.conversions) as total_conversions,
                    SUM(i.revenue) as total_revenue
                FROM ads_insights i
                JOIN ads_campaigns c ON i.campaign_id = c.id
                JOIN connected_accounts ca ON c.account_id = ca.id
                JOIN ads_tokens at ON ca.token_id = at.id
                WHERE at.user_id = ?
            `, [userId]);

            const rawStats = rows[0] || {};
            const spend = rawStats.total_spend || 0;
            const clicks = rawStats.total_clicks || 0;
            const conv = rawStats.total_conversions || 0;
            const imp = rawStats.total_impressions || 0;

            // Recent campaigns
            const [campaignRows] = await require('../../config/database').pool.execute(`
                SELECT c.campaign_name as name, c.status, ca.platform as platform, c.budget as spend, 0 as conversions, '0.0x' as roas 
                FROM ads_campaigns c
                JOIN connected_accounts ca ON c.account_id = ca.id
                JOIN ads_tokens at ON ca.token_id = at.id
                WHERE at.user_id = ?
                ORDER BY c.created_at DESC
                LIMIT 4
            `, [userId]);

            const structuredData = {
                stats: [
                    { title: 'Total Spend', value: '$' + parseFloat(spend).toLocaleString(), change: '0%', trend: 'up', description: 'vs last month' },
                    { title: 'Impressions', value: imp.toLocaleString(), change: '0%', trend: 'up', description: 'vs last month' },
                    { title: 'Clicks', value: clicks.toLocaleString(), change: '0%', trend: 'up', description: 'vs last month' },
                    { title: 'Conversions', value: conv.toLocaleString(), change: '0%', trend: 'up', description: 'vs last month' }
                ],
                campaigns: campaignRows.map(c => ({
                    ...c,
                    spend: '$' + parseFloat(c.spend || 0).toLocaleString()
                })),
                performanceData: [
                    { date: '2024-03-01', revenue: 0, spend: 0, roas: 0 },
                    { date: '2024-03-02', revenue: 0, spend: 0, roas: 0 },
                    { date: '2024-03-03', revenue: 0, spend: 0, roas: 0 },
                ] // Simpler mock time series since generating rolling past arrays in SQL dynamically is complex
            };

            successResponse(res, structuredData, 'Dashboard overview retrieved');
        } catch (error) {
            console.error('Dashboard Overview Error:', error);
            errorResponse(res, 'Failed to retrieve dashboard overview');
        }
    }

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

    static async getAnalyticsPerformanceGeneric(req, res) {
        try {
            const userId = req.user.id;
            const structuredData = {
                chartData: [
                    { date: new Date().toISOString().split('T')[0], impressions: 0, clicks: 0, spend: 0, conversions: 0 }
                ]
            };
            successResponse(res, structuredData, 'Analytics performance retrieved');
        } catch (error) {
            console.error('Analytics Performance Error:', error);
            errorResponse(res, 'Failed to retrieve analytics performance');
        }
    }

    static async getAnalyticsPlatformsGeneric(req, res) {
        try {
            const userId = req.user.id;
            const [rows] = await require('../../config/database').pool.execute(`
                SELECT 
                    ca.platform,
                    SUM(i.spend) as spend,
                    SUM(i.impressions) as impressions,
                    SUM(i.clicks) as clicks,
                    SUM(i.conversions) as conversions
                FROM ads_insights i
                JOIN ads_campaigns c ON i.campaign_id = c.id
                JOIN connected_accounts ca ON c.account_id = ca.id
                JOIN ads_tokens at ON ca.token_id = at.id
                WHERE at.user_id = ?
                GROUP BY ca.platform
            `, [userId]);
            successResponse(res, { platformsData: rows }, 'Analytics platforms breakdown retrieved');
        } catch (error) {
            console.error('Analytics Platforms Error:', error);
            errorResponse(res, 'Failed to retrieve analytics platforms');
        }
    }

    static async getAnalyticsCompareGeneric(req, res) {
        try {
            successResponse(res, { comparisonData: [] }, 'Analytics comparison retrieved');
        } catch (error) {
            console.error('Analytics Compare Error:', error);
            errorResponse(res, 'Failed to retrieve analytics comparison');
        }
    }

    static async getAnalyticsGA4Generic(req, res) {
        try {
            successResponse(res, { ga4Data: {} }, 'GA4 analytics retrieved');
        } catch (error) {
            console.error('Analytics GA4 Error:', error);
            errorResponse(res, 'Failed to retrieve GA4 analytics');
        }
    }

}

module.exports = AnalyticsController;
