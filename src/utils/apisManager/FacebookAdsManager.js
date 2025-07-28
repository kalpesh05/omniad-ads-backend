const axios = require('axios');
class FacebookAdsManager {
    constructor(authService) {
        this.authService = authService;
        this.baseUrl = 'https://graph.facebook.com/v18.0';
        this.apiVersion = 'v18.0';
    }

    // Helper method to get authenticated headers
    async getHeaders(userId) {
        const accessToken = await this.authService.getAccessToken(userId, 'facebook');
        return {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        };
    }

    // Execute Facebook API request with error handling
    async executeRequest(userId, method, endpoint, data = null, params = {}) {
        try {
            const accessToken = await this.authService.getAccessToken(userId, 'facebook');

            const config = {
                method,
                url: `${this.baseUrl}${endpoint}`,
                headers: {
                    'Content-Type': 'application/json'
                },
                params: {
                    access_token: accessToken,
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

    // ===========================================
    // ACCOUNT & BUSINESS MANAGEMENT
    // ===========================================

    // Get all ad accounts
    async getAdAccounts(userId) {
        return await this.executeRequest(userId, 'GET', '/me/adaccounts', null, {
            fields: 'id,name,account_status,currency,timezone_name,amount_spent,balance,created_time,business'
        });
    }

    // Get specific ad account details
    async getAdAccountDetails(userId, accountId) {
        return await this.executeRequest(userId, 'GET', `/${accountId}`, null, {
            fields: 'id,name,account_status,currency,timezone_name,amount_spent,balance,created_time,business,funding_source,min_campaign_group_spend_cap,min_daily_budget'
        });
    }

    // Get business accounts
    async getBusinessAccounts(userId) {
        return await this.executeRequest(userId, 'GET', '/me/businesses', null, {
            fields: 'id,name,primary_page,timezone_id,two_factor_type,created_time'
        });
    }

    // Get Instagram business accounts
    async getInstagramAccounts(userId) {
        return await this.executeRequest(userId, 'GET', '/me/accounts', null, {
            fields: 'id,name,instagram_business_account{id,name,username,profile_picture_url,followers_count,media_count}'
        });
    }

    // ===========================================
    // CAMPAIGN MANAGEMENT
    // ===========================================

    // Get campaigns
    async getCampaigns(userId, accountId, filters = {}) {
        const params = {
            fields: 'id,name,status,objective,created_time,start_time,stop_time,budget_rebalance_flag,buying_type,daily_budget,lifetime_budget,bid_strategy,promoted_object,special_ad_categories,spend_cap'
        };

        if (filters.status) {
            params.filtering = JSON.stringify([{
                field: 'status',
                operator: 'IN',
                value: Array.isArray(filters.status) ? filters.status : [filters.status]
            }]);
        }

        if (filters.objective) {
            params.filtering = JSON.stringify([{
                field: 'objective',
                operator: 'IN',
                value: Array.isArray(filters.objective) ? filters.objective : [filters.objective]
            }]);
        }

        return await this.executeRequest(userId, 'GET', `/${accountId}/campaigns`, null, params);
    }

    // Create campaign
    async createCampaign(userId, accountId, campaignData) {
        const data = {
            name: campaignData.name,
            objective: campaignData.objective, // REACH, TRAFFIC, CONVERSIONS, etc.
            status: campaignData.status || 'PAUSED',

            // Budget settings
            ...(campaignData.dailyBudget && { daily_budget: campaignData.dailyBudget }),
            ...(campaignData.lifetimeBudget && { lifetime_budget: campaignData.lifetimeBudget }),
            ...(campaignData.bidStrategy && { bid_strategy: campaignData.bidStrategy }),

            // Special ad categories (if applicable)
            ...(campaignData.specialAdCategories && {
                special_ad_categories: campaignData.specialAdCategories
            }),

            // Campaign optimization
            ...(campaignData.spendCap && { spend_cap: campaignData.spendCap }),
            ...(campaignData.startTime && { start_time: campaignData.startTime }),
            ...(campaignData.stopTime && { stop_time: campaignData.stopTime })
        };

        return await this.executeRequest(userId, 'POST', `/${accountId}/campaigns`, data);
    }

    // Update campaign
    async updateCampaign(userId, campaignId, updates) {
        return await this.executeRequest(userId, 'POST', `/${campaignId}`, updates);
    }

    // ===========================================
    // AD SET MANAGEMENT
    // ===========================================

    // Get ad sets
    async getAdSets(userId, accountId, campaignId = null) {
        const endpoint = campaignId ? `/${campaignId}/adsets` : `/${accountId}/adsets`;

        return await this.executeRequest(userId, 'GET', endpoint, null, {
            fields: 'id,name,status,campaign_id,created_time,start_time,end_time,daily_budget,lifetime_budget,optimization_goal,billing_event,bid_amount,targeting,promoted_object,attribution_spec'
        });
    }

    // Create ad set
    async createAdSet(userId, campaignId, adSetData) {
        const data = {
            name: adSetData.name,
            campaign_id: campaignId,
            status: adSetData.status || 'PAUSED',

            // Budget and bidding
            daily_budget: adSetData.dailyBudget,
            optimization_goal: adSetData.optimizationGoal, // REACH, IMPRESSIONS, CLICKS, etc.
            billing_event: adSetData.billingEvent || 'IMPRESSIONS',
            bid_amount: adSetData.bidAmount,

            // Targeting
            targeting: adSetData.targeting,

            // Scheduling
            ...(adSetData.startTime && { start_time: adSetData.startTime }),
            ...(adSetData.endTime && { end_time: adSetData.endTime }),

            // Attribution and optimization
            ...(adSetData.attributionSpec && { attribution_spec: adSetData.attributionSpec }),
            ...(adSetData.promotedObject && { promoted_object: adSetData.promotedObject })
        };

        return await this.executeRequest(userId, 'POST', `/${campaignId}/adsets`, data);
    }

    // ===========================================
    // AD CREATIVE MANAGEMENT
    // ===========================================

    // Get ad creatives
    async getAdCreatives(userId, accountId) {
        return await this.executeRequest(userId, 'GET', `/${accountId}/adcreatives`, null, {
            fields: 'id,name,title,body,image_hash,image_url,video_id,thumbnail_url,object_story_spec,call_to_action,link_url,instagram_permalink_url,status'
        });
    }

    // Create ad creative for Facebook/Instagram
    async createAdCreative(userId, accountId, creativeData) {
        const data = {
            name: creativeData.name,

            // Object story spec for different placements
            object_story_spec: {
                page_id: creativeData.pageId,

                // For link ads
                ...(creativeData.type === 'link' && {
                    link_data: {
                        message: creativeData.message,
                        link: creativeData.link,
                        name: creativeData.linkTitle,
                        description: creativeData.linkDescription,
                        image_hash: creativeData.imageHash,
                        call_to_action: creativeData.callToAction
                    }
                }),

                // For video ads
                ...(creativeData.type === 'video' && {
                    video_data: {
                        message: creativeData.message,
                        video_id: creativeData.videoId,
                        title: creativeData.title,
                        call_to_action: creativeData.callToAction
                    }
                }),

                // For photo ads
                ...(creativeData.type === 'photo' && {
                    photo_data: {
                        message: creativeData.message,
                        image_hash: creativeData.imageHash,
                        call_to_action: creativeData.callToAction
                    }
                }),

                // For carousel ads
                ...(creativeData.type === 'carousel' && {
                    link_data: {
                        message: creativeData.message,
                        link: creativeData.link,
                        child_attachments: creativeData.carouselCards,
                        call_to_action: creativeData.callToAction
                    }
                })
            },

            // Instagram-specific settings
            ...(creativeData.instagramActorId && {
                instagram_actor_id: creativeData.instagramActorId
            }),

            // Additional properties
            ...(creativeData.degrees && { degrees_of_freedom_spec: creativeData.degrees }),
            ...(creativeData.dynamicAdTemplate && { dynamic_ad_template: creativeData.dynamicAdTemplate })
        };

        return await this.executeRequest(userId, 'POST', `/${accountId}/adcreatives`, data);
    }

    // Upload image for ad creative
    async uploadImage(userId, accountId, imageData) {
        const data = {
            filename: imageData.filename,
            bytes: imageData.bytes // Base64 encoded image
        };

        return await this.executeRequest(userId, 'POST', `/${accountId}/adimages`, data);
    }

    // Upload video for ad creative
    async uploadVideo(userId, accountId, videoData) {
        const data = {
            upload_phase: 'start',
            file_size: videoData.fileSize,
            video_type: videoData.videoType || 'video/mp4'
        };

        return await this.executeRequest(userId, 'POST', `/${accountId}/advideos`, data);
    }

    // ===========================================
    // AD MANAGEMENT
    // ===========================================

    // Get ads
    async getAds(userId, accountId, adSetId = null) {
        const endpoint = adSetId ? `/${adSetId}/ads` : `/${accountId}/ads`;

        return await this.executeRequest(userId, 'GET', endpoint, null, {
            fields: 'id,name,status,adset_id,campaign_id,creative,created_time,updated_time,tracking_specs,conversion_specs'
        });
    }

    // Create ad
    async createAd(userId, adSetId, adData) {
        const data = {
            name: adData.name,
            adset_id: adSetId,
            creative: {
                creative_id: adData.creativeId
            },
            status: adData.status || 'PAUSED',

            // Tracking
            ...(adData.trackingSpecs && { tracking_specs: adData.trackingSpecs }),
            ...(adData.conversionSpecs && { conversion_specs: adData.conversionSpecs })
        };

        return await this.executeRequest(userId, 'POST', `/${adSetId}/ads`, data);
    }

    // ===========================================
    // TARGETING HELPERS
    // ===========================================

    // Get targeting options
    async getTargetingOptions(userId, type, query = '') {
        const params = {
            type: type, // interests, behaviors, demographics, etc.
            class: 'interests'
        };

        if (query) {
            params.q = query;
        }

        return await this.executeRequest(userId, 'GET', '/search', null, params);
    }

    // Get interest suggestions
    async getInterestSuggestions(userId, interests) {
        return await this.executeRequest(userId, 'GET', '/targeting_suggestions', null, {
            targeting_list: JSON.stringify(interests)
        });
    }

    // Get delivery estimate
    async getDeliveryEstimate(userId, accountId, targeting, optimization_goal) {
        const data = {
            targeting: targeting,
            optimization_goal: optimization_goal,
            currency: 'USD'
        };

        return await this.executeRequest(userId, 'POST', `/${accountId}/delivery_estimate`, data);
    }

    // ===========================================
    // INSTAGRAM SPECIFIC METHODS
    // ===========================================

    // Get Instagram insights
    async getInstagramInsights(userId, instagramAccountId, metrics, period = 'day') {
        return await this.executeRequest(userId, 'GET', `/${instagramAccountId}/insights`, null, {
            metric: metrics.join(','),
            period: period
        });
    }

    // Get Instagram media
    async getInstagramMedia(userId, instagramAccountId) {
        return await this.executeRequest(userId, 'GET', `/${instagramAccountId}/media`, null, {
            fields: 'id,media_type,media_url,caption,permalink,timestamp,like_count,comments_count'
        });
    }

    // Create Instagram post
    async createInstagramPost(userId, instagramAccountId, postData) {
        const data = {
            image_url: postData.imageUrl,
            caption: postData.caption,
            ...(postData.locationId && { location_id: postData.locationId })
        };

        return await this.executeRequest(userId, 'POST', `/${instagramAccountId}/media`, data);
    }

    // ===========================================
    // REPORTING & ANALYTICS
    // ===========================================

    // Get insights/reports
    async getInsights(userId, objectId, level = 'ad', datePreset = 'last_30d', fields = null) {
        const defaultFields = [
            'impressions', 'clicks', 'spend', 'reach', 'frequency',
            'ctr', 'cpc', 'cpp', 'cpm', 'conversions', 'cost_per_conversion'
        ];

        const params = {
            level: level, // account, campaign, adset, ad
            date_preset: datePreset,
            fields: (fields || defaultFields).join(',')
        };

        return await this.executeRequest(userId, 'GET', `/${objectId}/insights`, null, params);
    }

    // Get custom insights with date range
    async getCustomInsights(userId, objectId, startDate, endDate, level = 'ad', fields = null) {
        const defaultFields = [
            'impressions', 'clicks', 'spend', 'reach', 'frequency',
            'ctr', 'cpc', 'cpp', 'cpm', 'conversions', 'cost_per_conversion',
            'video_p25_watched_actions', 'video_p50_watched_actions', 'video_p75_watched_actions'
        ];

        const params = {
            level: level,
            time_range: JSON.stringify({
                since: startDate,
                until: endDate
            }),
            fields: (fields || defaultFields).join(',')
        };

        return await this.executeRequest(userId, 'GET', `/${objectId}/insights`, null, params);
    }

    // Get breakdown reports
    async getBreakdownInsights(userId, objectId, breakdowns, datePreset = 'last_30d') {
        const params = {
            breakdowns: breakdowns.join(','), // age, gender, country, placement, etc.
            date_preset: datePreset,
            fields: 'impressions,clicks,spend,conversions,ctr,cpc,cpm'
        };

        return await this.executeRequest(userId, 'GET', `/${objectId}/insights`, null, params);
    }

    // ===========================================
    // BULK OPERATIONS
    // ===========================================

    // Bulk update campaign status
    async bulkUpdateCampaignStatus(userId, campaignIds, status) {
        const promises = campaignIds.map(campaignId =>
            this.updateCampaign(userId, campaignId, { status })
        );

        return await Promise.allSettled(promises);
    }

    // Bulk create ads
    async bulkCreateAds(userId, adSetId, adsData) {
        const promises = adsData.map(adData =>
            this.createAd(userId, adSetId, adData)
        );

        return await Promise.allSettled(promises);
    }
}

module.exports = FacebookAdsManager;