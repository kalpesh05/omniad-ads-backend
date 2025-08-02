const axios = require('axios');

class GoogleAdsManager {
  constructor(authService) {
    this.authService = authService;
    this.baseUrl = 'https://googleads.googleapis.com/v16';
    this.apiVersion = 'v16';
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

  // Execute Google Ads API request with error handling
  async executeRequest(userId, method, endpoint, data = null, customerId = null) {
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

  // Get accessible customers (equivalent to ad accounts)
  async getAdAccounts(userId) {
    const endpoint = '/customers:listAccessibleCustomers';
    return await this.executeRequest(userId, 'GET', endpoint);
  }

  // Get all campaigns
  async getCampaigns(userId, customerId, filters = {}) {
    let query = `
      SELECT 
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.advertising_channel_sub_type,
        campaign.bidding_strategy_type,
        campaign.budget,
        campaign.start_date,
        campaign.end_date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value
      FROM campaign
      WHERE campaign.status != 'REMOVED'
    `;

    if (filters.campaignType) {
      query += ` AND campaign.advertising_channel_type = '${filters.campaignType}'`;
    }
    if (filters.status) {
      query += ` AND campaign.status = '${filters.status}'`;
    }

    return await this.searchReports(userId, customerId, query);
  }

  // Create campaign
  async createCampaign(userId, customerId, campaignData) {
    const operation = {
      create: {
        name: campaignData.name,
        status: campaignData.status || 'PAUSED',
        advertisingChannelType: campaignData.type || 'SEARCH',
        biddingStrategyType: campaignData.biddingStrategy || 'MANUAL_CPC',
        campaignBudget: `customers/${customerId}/campaignBudgets/${campaignData.budgetId}`,
        
        networkSettings: {
          targetGoogleSearch: campaignData.targetGoogleSearch !== false,
          targetSearchNetwork: campaignData.targetSearchNetwork !== false,
          targetContentNetwork: campaignData.targetContentNetwork || false,
          targetPartnerSearchNetwork: campaignData.targetPartnerSearchNetwork || false
        },

        ...(campaignData.startDate && { startDate: campaignData.startDate }),
        ...(campaignData.endDate && { endDate: campaignData.endDate })
      }
    };

    const endpoint = `/customers/${customerId}/campaigns:mutate`;
    const data = { operations: [operation] };
    
    return await this.executeRequest(userId, 'POST', endpoint, data, customerId);
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
    
    return await this.executeRequest(userId, 'POST', endpoint, data, customerId);
  }

  // Get ad groups (equivalent to ad sets)
  async getAdSets(userId, customerId, campaignId = null) {
    let query = `
      SELECT 
        ad_group.id,
        ad_group.name,
        ad_group.status,
        ad_group.campaign,
        ad_group.type,
        ad_group.cpc_bid_micros,
        ad_group.cpm_bid_micros,
        ad_group.target_cpa_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions
      FROM ad_group
      WHERE ad_group.status != 'REMOVED'
    `;

    if (campaignId) {
      query += ` AND ad_group.campaign = 'customers/${customerId}/campaigns/${campaignId}'`;
    }

    return await this.searchReports(userId, customerId, query);
  }

  // Create ad group (equivalent to ad set)
  async createAdSet(userId, campaignId, adGroupData) {
    const operation = {
      create: {
        name: adGroupData.name,
        status: adGroupData.status || 'PAUSED',
        campaign: `customers/${adGroupData.customerId}/campaigns/${campaignId}`,
        type: adGroupData.type || 'SEARCH_STANDARD',
        ...(adGroupData.cpcBidMicros && { cpcBidMicros: adGroupData.cpcBidMicros }),
        ...(adGroupData.cpmBidMicros && { cpmBidMicros: adGroupData.cpmBidMicros }),
        ...(adGroupData.targetCpaMicros && { targetCpaMicros: adGroupData.targetCpaMicros })
      }
    };

    const endpoint = `/customers/${adGroupData.customerId}/adGroups:mutate`;
    const data = { operations: [operation] };
    
    return await this.executeRequest(userId, 'POST', endpoint, data, adGroupData.customerId);
  }

  // Get ads
  async getAds(userId, customerId, adGroupId = null) {
    let query = `
      SELECT 
        ad_group_ad.ad.id,
        ad_group_ad.ad.name,
        ad_group_ad.status,
        ad_group_ad.ad_group,
        ad_group_ad.ad.type,
        ad_group_ad.ad.final_urls,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions
      FROM ad_group_ad
      WHERE ad_group_ad.status != 'REMOVED'
    `;

    if (adGroupId) {
      query += ` AND ad_group_ad.ad_group = 'customers/${customerId}/adGroups/${adGroupId}'`;
    }

    return await this.searchReports(userId, customerId, query);
  }

  // Create ad
  async createAd(userId, adSetId, adData) {
    const operation = {
      create: {
        adGroup: `customers/${adData.customerId}/adGroups/${adSetId}`,
        status: adData.status || 'PAUSED',
        ad: {
          finalUrls: adData.finalUrls,
          responsiveSearchAd: {
            headlines: adData.headlines.map(text => ({ text })),
            descriptions: adData.descriptions.map(text => ({ text })),
            path1: adData.path1,
            path2: adData.path2
          }
        }
      }
    };

    const endpoint = `/customers/${adData.customerId}/adGroupAds:mutate`;
    const data = { operations: [operation] };
    
    return await this.executeRequest(userId, 'POST', endpoint, data, adData.customerId);
  }

  // Generic search reports method
  async searchReports(userId, customerId, query, pageSize = 1000) {
    const endpoint = `/customers/${customerId}/googleAds:search`;
    const data = {
      query,
      pageSize,
      validateOnly: false
    };
    
    return await this.executeRequest(userId, 'POST', endpoint, data, customerId);
  }

  // Get insights/reports
  async getInsights(userId, customerId, level = 'campaign', datePreset = 'LAST_30_DAYS', fields = null) {
    const defaultFields = ['impressions', 'clicks', 'cost_micros', 'conversions'];
    const metrics = fields || defaultFields;

    let query = '';
    const dateRange = this.getDateRangeFromPreset(datePreset);
    
    switch (level) {
      case 'campaign':
        query = `
          SELECT 
            campaign.id,
            campaign.name,
            ${metrics.map(m => `metrics.${m}`).join(', ')},
            segments.date
          FROM campaign
          WHERE campaign.status != 'REMOVED'
            AND segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
        `;
        break;
        
      case 'ad':
        query = `
          SELECT 
            ad_group_ad.ad.id,
            ad_group_ad.ad.name,
            ad_group_ad.ad_group,
            ${metrics.map(m => `metrics.${m}`).join(', ')},
            segments.date
          FROM ad_group_ad
          WHERE ad_group_ad.status != 'REMOVED'
            AND segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
        `;
        break;
    }

    return await this.searchReports(userId, customerId, query);
  }

  // Get custom insights with date range
  async getCustomInsights(userId, customerId, startDate, endDate, level = 'campaign', fields = null) {
    const defaultFields = ['impressions', 'clicks', 'cost_micros', 'conversions'];
    const metrics = fields || defaultFields;

    let query = '';
    
    switch (level) {
      case 'campaign':
        query = `
          SELECT 
            campaign.id,
            campaign.name,
            ${metrics.map(m => `metrics.${m}`).join(', ')},
            segments.date
          FROM campaign
          WHERE campaign.status != 'REMOVED'
            AND segments.date BETWEEN '${startDate}' AND '${endDate}'
        `;
        break;
        
      case 'ad':
        query = `
          SELECT 
            ad_group_ad.ad.id,
            ad_group_ad.ad.name,
            ad_group_ad.ad_group,
            ${metrics.map(m => `metrics.${m}`).join(', ')},
            segments.date
          FROM ad_group_ad
          WHERE ad_group_ad.status != 'REMOVED'
            AND segments.date BETWEEN '${startDate}' AND '${endDate}'
        `;
        break;
    }

    return await this.searchReports(userId, customerId, query);
  }

  // Helper method to convert date presets
  getDateRangeFromPreset(preset) {
    const today = new Date();
    const start = new Date();
    
    switch (preset) {
      case 'LAST_7_DAYS':
        start.setDate(today.getDate() - 7);
        break;
      case 'LAST_30_DAYS':
        start.setDate(today.getDate() - 30);
        break;
      case 'LAST_90_DAYS':
        start.setDate(today.getDate() - 90);
        break;
      default:
        start.setDate(today.getDate() - 30);
    }
    
    return {
      start: start.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    };
  }
}

module.exports = GoogleAdsManager;