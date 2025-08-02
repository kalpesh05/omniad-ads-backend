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

    // Get all ad accounts
    async getAdAccounts(userId) {
        return await this.executeRequest(userId, 'GET', '/me/adaccounts', null, {
            fields: 'id,name,account_status,currency,timezone_name,amount_spent,balance,created_time,business'
        });
    }

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

        return await this.executeRequest(userId, 'GET', `/${accountId}/campaigns`, null, params);
    }

    // Create campaign
    async createCampaign(userId, accountId, campaignData) {
        const data = {
            name: campaignData.name,
            objective: campaignData.objective,
            status: campaignData.status || 'PAUSED',
            ...(campaignData.dailyBudget && { daily_budget: campaignData.dailyBudget }),
            ...(campaignData.lifetimeBudget && { lifetime_budget: campaignData.lifetimeBudget }),
            ...(campaignData.bidStrategy && { bid_strategy: campaignData.bidStrategy }),
            ...(campaignData.specialAdCategories && {
                special_ad_categories: campaignData.specialAdCategories
            }),
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
            daily_budget: adSetData.dailyBudget,
            optimization_goal: adSetData.optimizationGoal,
            billing_event: adSetData.billingEvent || 'IMPRESSIONS',
            bid_amount: adSetData.bidAmount,
            targeting: adSetData.targeting,
            ...(adSetData.startTime && { start_time: adSetData.startTime }),
            ...(adSetData.endTime && { end_time: adSetData.endTime }),
            ...(adSetData.attributionSpec && { attribution_spec: adSetData.attributionSpec }),
            ...(adSetData.promotedObject && { promoted_object: adSetData.promotedObject })
        };

        return await this.executeRequest(userId, 'POST', `/${campaignId}/adsets`, data);
    }

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
            ...(adData.trackingSpecs && { tracking_specs: adData.trackingSpecs }),
            ...(adData.conversionSpecs && { conversion_specs: adData.conversionSpecs })
        };

        return await this.executeRequest(userId, 'POST', `/${adSetId}/ads`, data);
    }

    // Get insights/reports
    async getInsights(userId, objectId, level = 'ad', datePreset = 'last_30d', fields = null) {
        const defaultFields = [
            'impressions', 'clicks', 'spend', 'reach', 'frequency',
            'ctr', 'cpc', 'cpp', 'cpm', 'conversions', 'cost_per_conversion'
        ];

        const params = {
            level: level,
            date_preset: datePreset,
            fields: (fields || defaultFields).join(',')
        };

        return await this.executeRequest(userId, 'GET', `/${objectId}/insights`, null, params);
    }

    // Get custom insights with date range
    async getCustomInsights(userId, objectId, startDate, endDate, level = 'ad', fields = null) {
        const defaultFields = [
            'impressions', 'clicks', 'spend', 'reach', 'frequency',
            'ctr', 'cpc', 'cpp', 'cpm', 'conversions', 'cost_per_conversion'
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
}

module.exports = FacebookAdsManager;