const axios = require('axios');

class YouTubeAdsManager {
    constructor(authService) {
        this.authService = authService;
        this.baseUrl = 'https://googleads.googleapis.com/v16';
        this.youtubeBaseUrl = 'https://www.googleapis.com/youtube/v3';
    }

    // Helper method to get authenticated headers
    async getHeaders(userId) {
        const accessToken = await this.authService.getAccessToken(userId, 'google');
        return {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN
        };
    }

    // Execute YouTube API request with error handling
    async executeYouTubeRequest(userId, method, endpoint, data = null, params = {}) {
        try {
            const accessToken = await this.authService.getAccessToken(userId, 'google');
            
            const config = {
                method,
                url: `${this.youtubeBaseUrl}${endpoint}`,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    key: process.env.YOUTUBE_API_KEY,
                    ...params
                },
                ...(data && { data })
            };

            const response = await axios(config);
            return {
                success: true,
                data: response.data,
                status: response.status
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || error.message,
                status: error.response?.status
            };
        }
    }

    // Execute Google Ads API request with error handling
    async executeAdsRequest(userId, method, endpoint, data = null, customerId = null) {
        try {
            const headers = await this.getHeaders(userId);
            if (customerId) {
                headers['login-customer-id'] = customerId;
            }

            const config = {
                method,
                url: `${this.baseUrl}${endpoint}`,
                headers,
                ...(data && { data })
            };

            const response = await axios(config);
            return {
                success: true,
                data: response.data,
                status: response.status
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || error.message,
                status: error.response?.status
            };
        }
    }

    // ===========================================
    // ACCOUNT & CHANNEL MANAGEMENT
    // ===========================================

    // Get YouTube channels
    async getChannels(userId) {
        return await this.executeYouTubeRequest(userId, 'GET', '/channels', null, {
            part: 'id,snippet,statistics,brandingSettings',
            mine: true
        });
    }

    // Get Google Ads customers/accounts
    async getAdAccounts(userId) {
        return await this.executeAdsRequest(userId, 'GET', '/customers:listAccessibleCustomers');
    }

    // Get channel videos
    async getChannelVideos(userId, channelId, maxResults = 50) {
        return await this.executeYouTubeRequest(userId, 'GET', '/search', null, {
            part: 'id,snippet',
            channelId: channelId,
            type: 'video',
            order: 'date',
            maxResults: maxResults
        });
    }

    // ===========================================
    // CAMPAIGN MANAGEMENT
    // ===========================================

    // Get YouTube campaigns
    async getCampaigns(userId, customerId, filters = {}) {
        let query = `
            SELECT 
                campaign.id,
                campaign.name,
                campaign.status,
                campaign.advertising_channel_type,
                campaign.advertising_channel_sub_type,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.video_views
            FROM campaign
            WHERE campaign.advertising_channel_type = 'VIDEO'
                AND campaign.status != 'REMOVED'
        `;

        if (filters.status) {
            const statusList = Array.isArray(filters.status) ? filters.status : [filters.status];
            query += ` AND campaign.status IN (${statusList.map(s => `'${s}'`).join(',')})`;
        }

        return await this.searchReports(userId, customerId, query);
    }

    // Create YouTube campaign
    async createCampaign(userId, customerId, campaignData) {
        const operation = {
            create: {
                name: campaignData.name,
                status: campaignData.status || 'PAUSED',
                advertisingChannelType: 'VIDEO',
                advertisingChannelSubType: campaignData.subType || 'VIDEO_ACTION',
                campaignBudget: `customers/${customerId}/campaignBudgets/${campaignData.budgetId}`,
                biddingStrategyType: campaignData.biddingStrategy || 'TARGET_CPM',
                ...(campaignData.startDate && { startDate: campaignData.startDate }),
                ...(campaignData.endDate && { endDate: campaignData.endDate })
            }
        };

        const endpoint = `/customers/${customerId}/campaigns:mutate`;
        const data = { operations: [operation] };
        
        return await this.executeAdsRequest(userId, 'POST', endpoint, data, customerId);
    }

    // Update campaign
    async updateCampaign(userId, customerId, campaignId, updates) {
        const operation = {
            update: {
                resourceName: `customers/${customerId}/campaigns/${campaignId}`,
                ...updates
            },
            updateMask: Object.keys(updates).join(',')
        };

        const endpoint = `/customers/${customerId}/campaigns:mutate`;
        const data = { operations: [operation] };
        
        return await this.executeAdsRequest(userId, 'POST', endpoint, data, customerId);
    }

    // ===========================================
    // AD GROUP MANAGEMENT
    // ===========================================

    // Get ad groups
    async getAdGroups(userId, customerId, campaignId = null) {
        let query = `
            SELECT 
                ad_group.id,
                ad_group.name,
                ad_group.status,
                ad_group.campaign,
                ad_group.type,
                ad_group.cpm_bid_micros,
                ad_group.cpv_bid_micros,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.video_views
            FROM ad_group
            WHERE ad_group.status != 'REMOVED'
        `;

        if (campaignId) {
            query += ` AND ad_group.campaign = 'customers/${customerId}/campaigns/${campaignId}'`;
        }

        return await this.searchReports(userId, customerId, query);
    }

    // Create ad group
    async createAdGroup(userId, customerId, adGroupData) {
        const operation = {
            create: {
                name: adGroupData.name,
                status: adGroupData.status || 'PAUSED',
                campaign: `customers/${customerId}/campaigns/${adGroupData.campaignId}`,
                type: adGroupData.type || 'VIDEO_TRUE_VIEW_IN_STREAM',
                ...(adGroupData.cpmBidMicros && { cpmBidMicros: adGroupData.cpmBidMicros }),
                ...(adGroupData.cpvBidMicros && { cpvBidMicros: adGroupData.cpvBidMicros })
            }
        };

        const endpoint = `/customers/${customerId}/adGroups:mutate`;
        const data = { operations: [operation] };
        
        return await this.executeAdsRequest(userId, 'POST', endpoint, data, customerId);
    }

    // ===========================================
    // AD MANAGEMENT
    // ===========================================

    // Get ads
    async getAds(userId, customerId, adGroupId = null) {
        let query = `
            SELECT 
                ad_group_ad.ad.id,
                ad_group_ad.ad.name,
                ad_group_ad.status,
                ad_group_ad.ad_group,
                ad_group_ad.ad.video_ad.video.id,
                ad_group_ad.ad.final_urls,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.video_views
            FROM ad_group_ad
            WHERE ad_group_ad.status != 'REMOVED'
                AND ad_group_ad.ad.type = 'VIDEO_AD'
        `;

        if (adGroupId) {
            query += ` AND ad_group_ad.ad_group = 'customers/${customerId}/adGroups/${adGroupId}'`;
        }

        return await this.searchReports(userId, customerId, query);
    }

    // Create TrueView In-Stream Ad
    async createAd(userId, customerId, adData) {
        const operation = {
            create: {
                adGroup: `customers/${customerId}/adGroups/${adData.adGroupId}`,
                status: adData.status || 'PAUSED',
                ad: {
                    name: adData.name,
                    finalUrls: adData.finalUrls,
                    videoAd: {
                        video: { id: adData.videoId },
                        inStream: {
                            actionButtonLabel: adData.actionButtonLabel || 'LEARN_MORE',
                            actionHeadline: adData.actionHeadline
                        }
                    }
                }
            }
        };

        const endpoint = `/customers/${customerId}/adGroupAds:mutate`;
        const data = { operations: [operation] };
        
        return await this.executeAdsRequest(userId, 'POST', endpoint, data, customerId);
    }

    // Create Bumper Ad
    async createBumperAd(userId, customerId, adData) {
        const operation = {
            create: {
                adGroup: `customers/${customerId}/adGroups/${adData.adGroupId}`,
                status: adData.status || 'PAUSED',
                ad: {
                    name: adData.name,
                    finalUrls: adData.finalUrls,
                    videoAd: {
                        video: { id: adData.videoId },
                        bumper: {}
                    }
                }
            }
        };

        const endpoint = `/customers/${customerId}/adGroupAds:mutate`;
        const data = { operations: [operation] };
        
        return await this.executeAdsRequest(userId, 'POST', endpoint, data, customerId);
    }

    // ===========================================
    // TARGETING
    // ===========================================

    // Add YouTube channel targeting
    async addChannelTargeting(userId, customerId, adGroupId, channelIds) {
        const operations = channelIds.map(channelId => ({
            create: {
                adGroup: `customers/${customerId}/adGroups/${adGroupId}`,
                youtubeChannel: { channelId: channelId }
            }
        }));

        const endpoint = `/customers/${customerId}/adGroupCriteria:mutate`;
        const data = { operations };
        
        return await this.executeAdsRequest(userId, 'POST', endpoint, data, customerId);
    }

    // Add demographic targeting
    async addDemographicTargeting(userId, customerId, adGroupId, demographics) {
        const operations = demographics.map(demo => ({
            create: {
                adGroup: `customers/${customerId}/adGroups/${adGroupId}`,
                [demo.type]: { type: demo.value }
            }
        }));

        const endpoint = `/customers/${customerId}/adGroupCriteria:mutate`;
        const data = { operations };
        
        return await this.executeAdsRequest(userId, 'POST', endpoint, data, customerId);
    }

    // ===========================================
    // REPORTING & ANALYTICS
    // ===========================================

    // Get insights/reports
    async getInsights(userId, customerId, objectType = 'campaign', dateRange = null, fields = null) {
        const defaultFields = [
            'impressions', 'clicks', 'cost_micros', 'video_views',
            'video_quartile_p25_rate', 'video_quartile_p50_rate', 
            'video_quartile_p75_rate', 'video_quartile_p100_rate'
        ];

        let query = `
            SELECT 
                ${objectType}.id,
                ${objectType}.name,
                ${(fields || defaultFields).map(f => `metrics.${f}`).join(', ')}
            FROM ${objectType}
            WHERE ${objectType}.status != 'REMOVED'
        `;

        if (objectType === 'campaign') {
            query += ` AND campaign.advertising_channel_type = 'VIDEO'`;
        }

        if (dateRange) {
            query += ` AND segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'`;
        }

        return await this.searchReports(userId, customerId, query);
    }

    // Get video performance report
    async getVideoPerformanceReport(userId, customerId, dateRange) {
        const query = `
            SELECT 
                ad_group_ad.ad.id,
                ad_group_ad.ad.name,
                ad_group_ad.ad.video_ad.video.id,
                campaign.name,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.video_views,
                metrics.video_quartile_p25_rate,
                metrics.video_quartile_p50_rate,
                metrics.video_quartile_p75_rate,
                metrics.video_quartile_p100_rate,
                segments.date
            FROM ad_group_ad
            WHERE ad_group_ad.ad.type = 'VIDEO_AD'
                AND ad_group_ad.status != 'REMOVED'
                AND segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
        `;

        return await this.searchReports(userId, customerId, query);
    }

    // Get channel analytics
    async getChannelAnalytics(userId, channelId, startDate, endDate) {
        return await this.executeYouTubeRequest(userId, 'GET', '/reports', null, {
            ids: `channel==${channelId}`,
            startDate: startDate,
            endDate: endDate,
            metrics: 'views,estimatedMinutesWatched,averageViewDuration,subscribersGained',
            dimensions: 'day'
        });
    }

    // ===========================================
    // ASSET MANAGEMENT
    // ===========================================

    // Upload video asset
    async uploadVideoAsset(userId, customerId, assetData) {
        const operation = {
            create: {
                name: assetData.name,
                type: 'YOUTUBE_VIDEO',
                youtubeVideoAsset: {
                    youtubeVideoId: assetData.youtubeVideoId,
                    youtubeVideoTitle: assetData.title
                }
            }
        };

        const endpoint = `/customers/${customerId}/assets:mutate`;
        const data = { operations: [operation] };
        
        return await this.executeAdsRequest(userId, 'POST', endpoint, data, customerId);
    }

    // Upload image asset
    async uploadImageAsset(userId, customerId, assetData) {
        const operation = {
            create: {
                name: assetData.name,
                type: 'IMAGE',
                imageAsset: {
                    data: assetData.imageData,
                    fileSize: assetData.fileSize,
                    mimeType: assetData.mimeType || 'image/jpeg'
                }
            }
        };

        const endpoint = `/customers/${customerId}/assets:mutate`;
        const data = { operations: [operation] };
        
        return await this.executeAdsRequest(userId, 'POST', endpoint, data, customerId);
    }

    // ===========================================
    // SHARED METHODS
    // ===========================================

    // Generic search reports method
    async searchReports(userId, customerId, query, pageSize = 1000) {
        const endpoint = `/customers/${customerId}/googleAds:search`;
        const data = {
            query,
            pageSize,
            validateOnly: false
        };
        
        return await this.executeAdsRequest(userId, 'POST', endpoint, data, customerId);
    }

    // ===========================================
    // BULK OPERATIONS
    // ===========================================

    // Bulk update campaign status
    async bulkUpdateCampaignStatus(userId, customerId, campaignIds, status) {
        const operations = campaignIds.map(campaignId => ({
            update: {
                resourceName: `customers/${customerId}/campaigns/${campaignId}`,
                status: status
            },
            updateMask: 'status'
        }));

        const endpoint = `/customers/${customerId}/campaigns:mutate`;
        const data = { operations };
        
        return await this.executeAdsRequest(userId, 'POST', endpoint, data, customerId);
    }

    // Bulk create ads
    async bulkCreateAds(userId, customerId, adsData) {
        const operations = adsData.map(adData => ({
            create: {
                adGroup: `customers/${customerId}/adGroups/${adData.adGroupId}`,
                status: adData.status || 'PAUSED',
                ad: {
                    name: adData.name,
                    finalUrls: adData.finalUrls,
                    videoAd: {
                        video: { id: adData.videoId },
                        inStream: {
                            actionButtonLabel: adData.actionButtonLabel || 'LEARN_MORE',
                            actionHeadline: adData.actionHeadline
                        }
                    }
                }
            }
        }));

        const endpoint = `/customers/${customerId}/adGroupAds:mutate`;
        const data = { operations };
        
        return await this.executeAdsRequest(userId, 'POST', endpoint, data, customerId);
    }
}

module.exports = YouTubeAdsManager;