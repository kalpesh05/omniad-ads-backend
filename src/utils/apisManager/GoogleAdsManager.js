// Google Ads API Manager - Complete Campaign Management System
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

  // ===========================================
  // ACCOUNT & CUSTOMER MANAGEMENT
  // ===========================================

  // Get accessible customers
  async getAccessibleCustomers(userId) {
    const endpoint = '/customers:listAccessibleCustomers';
    return await this.executeRequest(userId, 'GET', endpoint);
  }

  // Get customer info
  async getCustomerInfo(userId, customerId) {
    const endpoint = `/customers/${customerId}`;
    return await this.executeRequest(userId, 'GET', endpoint, null, customerId);
  }

  // Get customer hierarchy
  async getCustomerHierarchy(userId, customerId) {
    const query = `
      SELECT 
        customer_client.client_customer,
        customer_client.manager,
        customer_client.level,
        customer_client.time_zone,
        customer_client.currency_code,
        customer_client.descriptive_name
      FROM customer_client
    `;
    
    return await this.searchReports(userId, customerId, query);
  }

  // ===========================================
  // CAMPAIGN MANAGEMENT
  // ===========================================

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
        campaign.target_cpa.target_cpa_micros,
        campaign.target_roas.target_roas,
        campaign.maximize_conversions.target_cpa_micros,
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
    if (filters.dateRange) {
      query += ` AND segments.date BETWEEN '${filters.dateRange.start}' AND '${filters.dateRange.end}'`;
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
        
        // Network settings
        networkSettings: {
          targetGoogleSearch: campaignData.targetGoogleSearch !== false,
          targetSearchNetwork: campaignData.targetSearchNetwork !== false,
          targetContentNetwork: campaignData.targetContentNetwork || false,
          targetPartnerSearchNetwork: campaignData.targetPartnerSearchNetwork || false
        },

        // Bidding strategy specific settings
        ...(campaignData.biddingStrategy === 'TARGET_CPA' && {
          targetCpa: { targetCpaMicros: campaignData.targetCpaMicros }
        }),
        ...(campaignData.biddingStrategy === 'TARGET_ROAS' && {
          targetRoas: { targetRoas: campaignData.targetRoas }
        }),
        ...(campaignData.biddingStrategy === 'MAXIMIZE_CONVERSIONS' && {
          maximizeConversions: { targetCpaMicros: campaignData.targetCpaMicros }
        }),

        // Date settings
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

  // ===========================================
  // BUDGET MANAGEMENT
  // ===========================================

  // Get campaign budgets
  async getBudgets(userId, customerId) {
    const query = `
      SELECT 
        campaign_budget.id,
        campaign_budget.name,
        campaign_budget.amount_micros,
        campaign_budget.delivery_method,
        campaign_budget.explicitly_shared,
        campaign_budget.status
      FROM campaign_budget
    `;
    
    return await this.searchReports(userId, customerId, query);
  }

  // Create budget
  async createBudget(userId, customerId, budgetData) {
    const operation = {
      create: {
        name: budgetData.name,
        amountMicros: budgetData.amountMicros,
        deliveryMethod: budgetData.deliveryMethod || 'STANDARD',
        explicitlyShared: budgetData.shared || false
      }
    };

    const endpoint = `/customers/${customerId}/campaignBudgets:mutate`;
    const data = { operations: [operation] };
    
    return await this.executeRequest(userId, 'POST', endpoint, data, customerId);
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

  // Create ad group
  async createAdGroup(userId, customerId, adGroupData) {
    const operation = {
      create: {
        name: adGroupData.name,
        status: adGroupData.status || 'PAUSED',
        campaign: `customers/${customerId}/campaigns/${adGroupData.campaignId}`,
        type: adGroupData.type || 'SEARCH_STANDARD',
        
        // Bidding
        ...(adGroupData.cpcBidMicros && { cpcBidMicros: adGroupData.cpcBidMicros }),
        ...(adGroupData.cpmBidMicros && { cpmBidMicros: adGroupData.cpmBidMicros }),
        ...(adGroupData.targetCpaMicros && { targetCpaMicros: adGroupData.targetCpaMicros })
      }
    };

    const endpoint = `/customers/${customerId}/adGroups:mutate`;
    const data = { operations: [operation] };
    
    return await this.executeRequest(userId, 'POST', endpoint, data, customerId);
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
        ad_group_ad.ad.type,
        ad_group_ad.ad.final_urls,
        ad_group_ad.ad.display_url,
        ad_group_ad.ad.expanded_text_ad.headline_part1,
        ad_group_ad.ad.expanded_text_ad.headline_part2,
        ad_group_ad.ad.expanded_text_ad.description,
        ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group_ad.ad.responsive_search_ad.descriptions,
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

  // Create Responsive Search Ad
  async createResponsiveSearchAd(userId, customerId, adData) {
    const operation = {
      create: {
        adGroup: `customers/${customerId}/adGroups/${adData.adGroupId}`,
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

    const endpoint = `/customers/${customerId}/adGroupAds:mutate`;
    const data = { operations: [operation] };
    
    return await this.executeRequest(userId, 'POST', endpoint, data, customerId);
  }

  // Create Expanded Text Ad
  async createExpandedTextAd(userId, customerId, adData) {
    const operation = {
      create: {
        adGroup: `customers/${customerId}/adGroups/${adData.adGroupId}`,
        status: adData.status || 'PAUSED',
        ad: {
          finalUrls: adData.finalUrls,
          expandedTextAd: {
            headlinePart1: adData.headline1,
            headlinePart2: adData.headline2,
            description: adData.description,
            path1: adData.path1,
            path2: adData.path2
          }
        }
      }
    };

    const endpoint = `/customers/${customerId}/adGroupAds:mutate`;
    const data = { operations: [operation] };
    
    return await this.executeRequest(userId, 'POST', endpoint, data, customerId);
  }

  // ===========================================
  // KEYWORD MANAGEMENT
  // ===========================================

  // Get keywords
  async getKeywords(userId, customerId, adGroupId = null) {
    let query = `
      SELECT 
        ad_group_criterion.criterion_id,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group_criterion.status,
        ad_group_criterion.ad_group,
        ad_group_criterion.cpc_bid_micros,
        ad_group_criterion.final_urls,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.average_cpc,
        metrics.ctr,
        metrics.average_position
      FROM keyword_view
      WHERE ad_group_criterion.status != 'REMOVED'
    `;

    if (adGroupId) {
      query += ` AND ad_group_criterion.ad_group = 'customers/${customerId}/adGroups/${adGroupId}'`;
    }

    return await this.searchReports(userId, customerId, query);
  }

  // Add keywords to ad group
  async addKeywords(userId, customerId, adGroupId, keywords) {
    const operations = keywords.map(keyword => ({
      create: {
        adGroup: `customers/${customerId}/adGroups/${adGroupId}`,
        status: keyword.status || 'ENABLED',
        keyword: {
          text: keyword.text,
          matchType: keyword.matchType || 'BROAD'
        },
        ...(keyword.cpcBidMicros && { cpcBidMicros: keyword.cpcBidMicros }),
        ...(keyword.finalUrls && { finalUrls: keyword.finalUrls })
      }
    }));

    const endpoint = `/customers/${customerId}/adGroupCriteria:mutate`;
    const data = { operations };
    
    return await this.executeRequest(userId, 'POST', endpoint, data, customerId);
  }

  // ===========================================
  // NEGATIVE KEYWORDS
  // ===========================================

  // Get negative keywords
  async getNegativeKeywords(userId, customerId, campaignId = null, adGroupId = null) {
    let query = `
      SELECT 
        campaign_criterion.criterion_id,
        campaign_criterion.keyword.text,
        campaign_criterion.keyword.match_type,
        campaign_criterion.campaign,
        campaign_criterion.negative
      FROM campaign_criterion
      WHERE campaign_criterion.negative = true
        AND campaign_criterion.type = 'KEYWORD'
        AND campaign_criterion.status != 'REMOVED'
    `;

    if (campaignId) {
      query += ` AND campaign_criterion.campaign = 'customers/${customerId}/campaigns/${campaignId}'`;
    }

    // Also get ad group level negative keywords
    if (adGroupId) {
      const adGroupQuery = `
        SELECT 
          ad_group_criterion.criterion_id,
          ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type,
          ad_group_criterion.ad_group,
          ad_group_criterion.negative
        FROM ad_group_criterion
        WHERE ad_group_criterion.negative = true
          AND ad_group_criterion.type = 'KEYWORD'
          AND ad_group_criterion.status != 'REMOVED'
          AND ad_group_criterion.ad_group = 'customers/${customerId}/adGroups/${adGroupId}'
      `;
      
      return await this.searchReports(userId, customerId, adGroupQuery);
    }

    return await this.searchReports(userId, customerId, query);
  }

  // Add negative keywords
  async addNegativeKeywords(userId, customerId, level, levelId, negativeKeywords) {
    const operations = negativeKeywords.map(keyword => ({
      create: {
        ...(level === 'campaign' 
          ? { campaign: `customers/${customerId}/campaigns/${levelId}` }
          : { adGroup: `customers/${customerId}/adGroups/${levelId}` }
        ),
        negative: true,
        keyword: {
          text: keyword.text,
          matchType: keyword.matchType || 'BROAD'
        }
      }
    }));

    const endpoint = level === 'campaign' 
      ? `/customers/${customerId}/campaignCriteria:mutate`
      : `/customers/${customerId}/adGroupCriteria:mutate`;
      
    const data = { operations };
    
    return await this.executeRequest(userId, 'POST', endpoint, data, customerId);
  }

  // ===========================================
  // EXTENSIONS MANAGEMENT
  // ===========================================

  // Get sitelink extensions
  async getSitelinkExtensions(userId, customerId) {
    const query = `
      SELECT 
        extension_feed_item.id,
        extension_feed_item.sitelink_feed_item.link_text,
        extension_feed_item.sitelink_feed_item.line1,
        extension_feed_item.sitelink_feed_item.line2,
        extension_feed_item.sitelink_feed_item.final_urls,
        extension_feed_item.status
      FROM extension_feed_item
      WHERE extension_feed_item.extension_type = 'SITELINK'
        AND extension_feed_item.status != 'REMOVED'
    `;
    
    return await this.searchReports(userId, customerId, query);
  }

  // Create sitelink extensions
  async createSitelinkExtensions(userId, customerId, sitelinks) {
    const operations = sitelinks.map(sitelink => ({
      create: {
        extensionType: 'SITELINK',
        sitelinkFeedItem: {
          linkText: sitelink.linkText,
          line1: sitelink.line1,
          line2: sitelink.line2,
          finalUrls: sitelink.finalUrls
        }
      }
    }));

    const endpoint = `/customers/${customerId}/extensionFeedItems:mutate`;
    const data = { operations };
    
    return await this.executeRequest(userId, 'POST', endpoint, data, customerId);
  }

  // ===========================================
  // REPORTING & ANALYTICS
  // ===========================================

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

  // Get performance report
  async getPerformanceReport(userId, customerId, reportConfig) {
    const {
      level = 'campaign', // campaign, adGroup, keyword, ad
      metrics = ['impressions', 'clicks', 'cost_micros', 'conversions'],
      dateRange = { start: '2024-01-01', end: '2024-12-31' },
      filters = {}
    } = reportConfig;

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
            AND segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
        `;
        break;
        
      case 'adGroup':
        query = `
          SELECT 
            ad_group.id,
            ad_group.name,
            ad_group.campaign,
            ${metrics.map(m => `metrics.${m}`).join(', ')},
            segments.date
          FROM ad_group
          WHERE ad_group.status != 'REMOVED'
            AND segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
        `;
        break;
        
      case 'keyword':
        query = `
          SELECT 
            ad_group_criterion.criterion_id,
            ad_group_criterion.keyword.text,
            ad_group_criterion.keyword.match_type,
            ad_group_criterion.ad_group,
            ${metrics.map(m => `metrics.${m}`).join(', ')},
            segments.date
          FROM keyword_view
          WHERE ad_group_criterion.status != 'REMOVED'
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

    // Apply additional filters
    if (filters.campaignId) {
      query += ` AND campaign.id = ${filters.campaignId}`;
    }
    if (filters.adGroupId) {
      query += ` AND ad_group.id = ${filters.adGroupId}`;
    }

    return await this.searchReports(userId, customerId, query);
  }

  // Get conversion tracking data
  async getConversions(userId, customerId, dateRange) {
    const query = `
      SELECT 
        campaign.id,
        campaign.name,
        conversion_action.id,
        conversion_action.name,
        conversion_action.type,
        metrics.conversions,
        metrics.conversions_value,
        metrics.all_conversions,
        metrics.all_conversions_value,
        segments.conversion_action,
        segments.date
      FROM conversion_action
      WHERE segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
        AND metrics.conversions > 0
    `;
    
    return await this.searchReports(userId, customerId, query);
  }

  // Get audience insights
  async getAudienceReport(userId, customerId, dateRange) {
    const query = `
      SELECT 
        campaign.id,
        campaign.name,
        ad_group.id,
        ad_group.name,
        segments.ad_network_type,
        segments.device,
        segments.age_range,
        segments.gender,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        segments.date
      FROM age_range_view
      WHERE segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
    `;
    
    return await this.searchReports(userId, customerId, query);
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
    
    return await this.executeRequest(userId, 'POST', endpoint, data, customerId);
  }

  // Bulk update keyword bids
  async bulkUpdateKeywordBids(userId, customerId, keywordUpdates) {
    const operations = keywordUpdates.map(update => ({
      update: {
        resourceName: `customers/${customerId}/adGroupCriteria/${update.criterionId}`,
        cpcBidMicros: update.cpcBidMicros
      },
      updateMask: 'cpc_bid_micros'
    }));

    const endpoint = `/customers/${customerId}/adGroupCriteria:mutate`;
    const data = { operations };
    
    return await this.executeRequest(userId, 'POST', endpoint, data, customerId);
  }
}

module.exports = GoogleAdsManager;