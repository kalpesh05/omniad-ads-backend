const axios = require('axios');

class LinkedInAdsManager {
    constructor(authService) {
        this.authService = authService;
        this.baseUrl = 'https://api.linkedin.com/v2';
    }

    // Helper method to get authenticated headers
    async getHeaders(userId) {
        const accessToken = await this.authService.getAccessToken(userId, 'linkedin');
        return {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202401'
        };
    }

    // Execute LinkedIn API request with error handling
    async executeRequest(userId, method, endpoint, data = null, params = {}) {
        try {
            const headers = await this.getHeaders(userId);

            const config = {
                method,
                url: `${this.baseUrl}${endpoint}`,
                headers,
                params,
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
    // ACCOUNT MANAGEMENT
    // ===========================================

    // Get LinkedIn Ad Accounts
    async getAdAccounts(userId) {
        return await this.executeRequest(userId, 'GET', '/adAccounts', null, {
            q: 'search'
        });
    }

    // ===========================================
    // CAMPAIGN MANAGEMENT
    // ===========================================

    // Get LinkedIn Campaigns
    async getCampaigns(userId, accountId, filters = {}) {
        const params = {
            q: 'search',
            'search.account.values[0]': `urn:li:sponsoredAccount:${accountId}`
        };

        if (filters.status) {
            params['search.status.values[0]'] = filters.status.toUpperCase();
        }

        return await this.executeRequest(userId, 'GET', '/adCampaignsV2', null, params);
    }

    // Create LinkedIn Campaign
    async createCampaign(userId, accountId, campaignData) {
        const data = {
            account: `urn:li:sponsoredAccount:${accountId}`,
            campaignGroup: `urn:li:sponsoredCampaignGroup:${campaignData.campaignGroupId}`,
            name: campaignData.name,
            objectiveType: campaignData.objective || 'LEAD_GENERATION',
            status: campaignData.status || 'DRAFT',
            dailyBudget: {
                currencyCode: campaignData.currencyCode || 'USD',
                amount: campaignData.budget
            },
            runSchedule: {
                start: campaignData.startDate ? new Date(campaignData.startDate).getTime() : Date.now()
            }
        };

        return await this.executeRequest(userId, 'POST', '/adCampaignsV2', data);
    }

    // Update LinkedIn Campaign
    async updateCampaign(userId, accountId, campaignId, updates) {
        // Prepare patch operations per LinkedIn Rest.li spec
        const patch = { $set: {} };
        if (updates.status) patch.$set.status = updates.status;
        if (updates.budget) patch.$set.dailyBudget = { amount: updates.budget };
        if (updates.name) patch.$set.name = updates.name;

        return await this.executeRequest(userId, 'POST', `/adCampaignsV2/${campaignId}`, { patch });
    }

    // ===========================================
    // AD GROUP / CAMPAIGN GROUP MANAGEMENT
    // ===========================================

    // Get Ad Sets / Campaign Groups
    async getAdSets(userId, accountId, campaignId = null) {
        const params = {
            q: 'search',
            'search.account.values[0]': `urn:li:sponsoredAccount:${accountId}`
        };

        return await this.executeRequest(userId, 'GET', '/adCampaignGroups', null, params);
    }

    // Create Campaign Group
    async createAdSet(userId, accountId, adSetData) {
        const data = {
            account: `urn:li:sponsoredAccount:${accountId}`,
            name: adSetData.name,
            status: adSetData.status || 'DRAFT'
        };

        return await this.executeRequest(userId, 'POST', '/adCampaignGroups', data);
    }

    // ===========================================
    // AD MANAGEMENT
    // ===========================================

    // Get Ads (Creatives)
    async getAds(userId, accountId, campaignId = null) {
        const params = {
            q: 'search'
        };

        if (campaignId) {
            params['search.campaign.values[0]'] = `urn:li:sponsoredCampaign:${campaignId}`;
        }

        return await this.executeRequest(userId, 'GET', '/adCreativesV2', null, params);
    }

    // Create Ad
    async createAd(userId, accountId, adData) {
        const data = {
            campaign: `urn:li:sponsoredCampaign:${adData.campaignId}`,
            status: adData.status || 'ACTIVE',
            variables: {
                data: {
                    initalText: adData.text,
                    destinationUrl: adData.finalUrls[0]
                }
            }
        };

        return await this.executeRequest(userId, 'POST', '/adCreativesV2', data);
    }
}

module.exports = LinkedInAdsManager;
