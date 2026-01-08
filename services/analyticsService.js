const AdPlatformAuthenticator = require('../utils/adsPlatformAuthenticator');
const ConnectedAccount = require('../models/ConnectedAccount');
const { queryToDateRange, getYearDateRange } = require('../utils/common');

class AnalyticsService {
  constructor() {
    this.authenticator = new AdPlatformAuthenticator();
  }

  // Helper to get analytics access token
  async getAnalyticsToken(userId) {
    const accessToken = await this.authenticator.getValidAccessToken(userId, 'analytics');
    if (!accessToken) {
      throw new Error('No valid analytics access token found. Please re-authenticate.');
    }
    return accessToken;
  }

  // Helper to get total sessions
  async getTotalSessions(accessToken, propertyId, startDate, endDate) {
    try {
      const report = await this.authenticator.runGoogleAnalyticsReport(
        accessToken,
        propertyId,
        startDate,
        endDate,
        [],
        ['sessions']
      );
      return parseInt(report.rows?.[0]?.metricValues?.[0]?.value || 0);
    } catch (error) {
      console.error('Error getting total sessions:', error);
      return 0;
    }
  }

  // Helper to group segments by dimension
  groupSegmentsByDimension(segments, dimension) {
    const grouped = {};

    segments.forEach(segment => {
      const key = segment[dimension] || 'unknown';
      if (!grouped[key]) {
        grouped[key] = {
          dimension: key,
          totalUsers: 0,
          totalRevenue: 0,
          averageLTV: 0,
          segments: []
        };
      }

      grouped[key].totalUsers += segment.users;
      grouped[key].totalRevenue += segment.revenue;
      grouped[key].segments.push(segment);
    });

    // Calculate average LTV for each group
    Object.values(grouped).forEach(group => {
      group.averageLTV = group.totalUsers > 0
        ? Math.round((group.totalRevenue / group.totalUsers) * 100) / 100
        : 0;
    });

    return grouped;
  }

  // ===========================================
  // CONVERSION ANALYTICS
  // ===========================================

  async getConversionFunnel(userId, propertyId, startDate, endDate) {
    try {
      const accessToken = await this.getAnalyticsToken(userId);

      // Get conversion events data
      const report = await this.authenticator.runGoogleAnalyticsReport(
        accessToken,
        propertyId,
        startDate,
        endDate,
        ['eventName'],
        ['conversions', 'sessionsWithConversions', 'totalUsers']
      );

      // Process the data to create conversion funnel
      const rows = report.rows || [];
      const totalSessions = await this.getTotalSessions(accessToken, propertyId, startDate, endDate);

      // Define conversion funnel stages (this would be customized based on business logic)
      const funnelStages = [
        { name: 'Awareness', eventNames: ['page_view', 'session_start'] },
        { name: 'Interest', eventNames: ['scroll', 'click'] },
        { name: 'Consideration', eventNames: ['view_item', 'add_to_cart'] },
        { name: 'Purchase', eventNames: ['purchase', 'begin_checkout'] }
      ];

      let cumulativeUsers = totalSessions;
      const stages = funnelStages.map(stage => {
        const stageEvents = rows.filter(row =>
          stage.eventNames.includes(row.dimensionValues[0]?.value)
        );

        const stageUsers = stageEvents.reduce((sum, row) =>
          sum + parseInt(row.metricValues[2]?.value || 0), 0
        );

        const percentage = cumulativeUsers > 0 ? (stageUsers / cumulativeUsers) * 100 : 0;
        cumulativeUsers = stageUsers;

        return {
          name: stage.name,
          count: stageUsers,
          percentage: Math.round(percentage * 100) / 100
        };
      });

      const totalConversions = stages[stages.length - 1]?.count || 0;
      const conversionRate = totalSessions > 0 ? (totalConversions / totalSessions) * 100 : 0;

      return {
        success: true,
        data: {
          stages,
          totalConversions,
          conversionRate: Math.round(conversionRate * 100) / 100
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getConversionsBySource(userId, propertyId, startDate, endDate) {
    try {
      const accessToken = await this.getAnalyticsToken(userId);

      // Get conversions by source
      const report = await this.authenticator.runGoogleAnalyticsReport(
        accessToken,
        propertyId,
        startDate,
        endDate,
        ['sessionDefaultChannelGroup', 'sessionSource'],
        ['conversions', 'totalRevenue']
      );

      const rows = report.rows || [];
      const sources = rows.map(row => ({
        source: row.dimensionValues[1]?.value || 'unknown',
        channel: row.dimensionValues[0]?.value || 'unknown',
        conversions: parseInt(row.metricValues[0]?.value || 0),
        revenue: parseFloat(row.metricValues[1]?.value || 0)
      }));

      return {
        success: true,
        data: { sources }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getConversionGoals(userId, propertyId, startDate, endDate) {
    try {
      const accessToken = await this.getAnalyticsToken(userId);

      // Get conversion events
      const report = await this.authenticator.runGoogleAnalyticsReport(
        accessToken,
        propertyId,
        startDate,
        endDate,
        ['eventName'],
        ['conversions', 'eventValue']
      );

      const rows = report.rows || [];
      const goals = rows
        .filter(row => parseInt(row.metricValues[0]?.value || 0) > 0)
        .map(row => ({
          name: row.dimensionValues[0]?.value || 'Unknown Goal',
          completions: parseInt(row.metricValues[0]?.value || 0),
          value: parseFloat(row.metricValues[1]?.value || 0)
        }))
        .sort((a, b) => b.completions - a.completions)
        .slice(0, 10); // Top 10 goals

      return {
        success: true,
        data: { goals }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ===========================================
  // REVENUE ANALYTICS
  // ===========================================

  async getRevenueByChannel(userId, propertyId, startDate, endDate) {
    try {
      const accessToken = await this.getAnalyticsToken(userId);

      // Get revenue by channel
      const report = await this.authenticator.runGoogleAnalyticsReport(
        accessToken,
        propertyId,
        startDate,
        endDate,
        ['sessionDefaultChannelGroup'],
        ['totalRevenue', 'transactions']
      );

      const rows = report.rows || [];
      const channels = rows.map(row => ({
        channel: row.dimensionValues[0]?.value || 'unknown',
        revenue: parseFloat(row.metricValues[0]?.value || 0),
        transactions: parseInt(row.metricValues[1]?.value || 0)
      }));

      const totalRevenue = channels.reduce((sum, channel) => sum + channel.revenue, 0);

      return {
        success: true,
        data: {
          channels,
          totalRevenue
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getRevenueByCampaigns(userId, propertyId, startDate, endDate) {
    try {
      const accessToken = await this.getAnalyticsToken(userId);

      // Get revenue by campaign
      const report = await this.authenticator.runGoogleAnalyticsReport(
        accessToken,
        propertyId,
        startDate,
        endDate,
        ['campaignName', 'campaignId'],
        ['totalRevenue', 'advertisingSpend']
      );

      const rows = report.rows || [];
      const campaigns = rows
        .filter(row => parseFloat(row.metricValues[0]?.value || 0) > 0)
        .map(row => {
          const revenue = parseFloat(row.metricValues[0]?.value || 0);
          const spend = parseFloat(row.metricValues[1]?.value || 0);
          const roas = spend > 0 ? revenue / spend : 0;

          return {
            campaignId: row.dimensionValues[1]?.value || 'unknown',
            name: row.dimensionValues[0]?.value || 'Unknown Campaign',
            revenue,
            roas: Math.round(roas * 100) / 100
          };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10); // Top 10 campaigns

      return {
        success: true,
        data: { campaigns }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getLifetimeValue(userId, propertyId, startDate, endDate) {
    try {
      const accessToken = await this.getAnalyticsToken(userId);

      // Get LTV data by cohort (first user source/medium)
      const report = await this.authenticator.runGoogleAnalyticsReport(
        accessToken,
        propertyId,
        startDate,
        endDate,
        ['firstUserSourceMedium', 'cohort'],
        ['totalRevenue', 'totalUsers']
      );

      const rows = report.rows || [];
      const cohortData = rows.map(row => ({
        cohort: row.dimensionValues[1]?.value || 'unknown',
        sourceMedium: row.dimensionValues[0]?.value || 'unknown',
        revenue: parseFloat(row.metricValues[0]?.value || 0),
        users: parseInt(row.metricValues[1]?.value || 0)
      }));

      // Calculate LTV for each cohort
      const ltvByCohort = cohortData
        .filter(item => item.users > 0)
        .map(item => ({
          cohort: item.cohort,
          ltv: Math.round((item.revenue / item.users) * 100) / 100
        }))
        .sort((a, b) => b.ltv - a.ltv)
        .slice(0, 10);

      // Calculate overall metrics
      const totalRevenue = cohortData.reduce((sum, item) => sum + item.revenue, 0);
      const totalUsers = cohortData.reduce((sum, item) => sum + item.users, 0);
      const averageLTV = totalUsers > 0 ? Math.round((totalRevenue / totalUsers) * 100) / 100 : 0;

      // Calculate median LTV
      const ltvValues = ltvByCohort.map(item => item.ltv).sort((a, b) => a - b);
      const medianLTV = ltvValues.length > 0
        ? ltvValues.length % 2 === 0
          ? (ltvValues[ltvValues.length / 2 - 1] + ltvValues[ltvValues.length / 2]) / 2
          : ltvValues[Math.floor(ltvValues.length / 2)]
        : 0;

      return {
        success: true,
        data: {
          averageLTV,
          medianLTV: Math.round(medianLTV * 100) / 100,
          ltvByCohort
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getLifetimeValueBySegments(userId, propertyId, startDate, endDate) {
    try {
      const accessToken = await this.getAnalyticsToken(userId);

      // Get LTV data segmented by multiple dimensions
      const report = await this.authenticator.runGoogleAnalyticsReport(
        accessToken,
        propertyId,
        startDate,
        endDate,
        ['deviceCategory', 'newVsReturning', 'firstUserSourceMedium'],
        ['totalRevenue', 'totalUsers', 'sessions', 'engagedSessions']
      );

      const rows = report.rows || [];

      // Group data by segments
      const segments = {};
      rows.forEach(row => {
        const deviceCategory = row.dimensionValues[0]?.value || 'unknown';
        const userType = row.dimensionValues[1]?.value || 'unknown';
        const sourceMedium = row.dimensionValues[2]?.value || 'unknown';

        const segmentKey = `${deviceCategory}_${userType}_${sourceMedium}`;

        if (!segments[segmentKey]) {
          segments[segmentKey] = {
            segmentId: segmentKey,
            segmentName: `${deviceCategory} - ${userType} - ${sourceMedium}`,
            deviceCategory,
            userType,
            sourceMedium,
            revenue: 0,
            users: 0,
            sessions: 0,
            engagedSessions: 0
          };
        }

        segments[segmentKey].revenue += parseFloat(row.metricValues[0]?.value || 0);
        segments[segmentKey].users += parseInt(row.metricValues[1]?.value || 0);
        segments[segmentKey].sessions += parseInt(row.metricValues[2]?.value || 0);
        segments[segmentKey].engagedSessions += parseInt(row.metricValues[3]?.value || 0);
      });

      // Calculate LTV for each segment
      const segmentsArray = Object.values(segments)
        .filter(segment => segment.users > 0)
        .map(segment => ({
          segmentId: segment.segmentId,
          segmentName: segment.segmentName,
          deviceCategory: segment.deviceCategory,
          userType: segment.userType,
          sourceMedium: segment.sourceMedium,
          users: segment.users,
          sessions: segment.sessions,
          engagedSessions: segment.engagedSessions,
          revenue: Math.round(segment.revenue * 100) / 100,
          ltv: Math.round((segment.revenue / segment.users) * 100) / 100,
          engagementRate: segment.sessions > 0
            ? Math.round((segment.engagedSessions / segment.sessions) * 100 * 100) / 100
            : 0
        }))
        .sort((a, b) => b.ltv - a.ltv)
        .slice(0, 20); // Top 20 segments

      // Calculate overall metrics
      const totalRevenue = segmentsArray.reduce((sum, segment) => sum + segment.revenue, 0);
      const totalUsers = segmentsArray.reduce((sum, segment) => sum + segment.users, 0);
      const averageLTV = totalUsers > 0 ? Math.round((totalRevenue / totalUsers) * 100) / 100 : 0;

      // Calculate median LTV
      const ltvValues = segmentsArray.map(segment => segment.ltv).sort((a, b) => a - b);
      const medianLTV = ltvValues.length > 0
        ? ltvValues.length % 2 === 0
          ? (ltvValues[ltvValues.length / 2 - 1] + ltvValues[ltvValues.length / 2]) / 2
          : ltvValues[Math.floor(ltvValues.length / 2)]
        : 0;

      return {
        success: true,
        data: {
          averageLTV,
          medianLTV: Math.round(medianLTV * 100) / 100,
          totalSegments: segmentsArray.length,
          segments: segmentsArray,
          segmentBreakdown: {
            byDeviceCategory: this.groupSegmentsByDimension(segmentsArray, 'deviceCategory'),
            byUserType: this.groupSegmentsByDimension(segmentsArray, 'userType'),
            bySourceMedium: this.groupSegmentsByDimension(segmentsArray, 'sourceMedium')
          }
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ===========================================
  // CUSTOM EVENTS
  // ===========================================

  async getCustomEvents(userId, propertyId, startDate, endDate) {
    try {
      const accessToken = await this.getAnalyticsToken(userId);

      // Get custom events (excluding standard GA4 events)
      const report = await this.authenticator.runGoogleAnalyticsReport(
        accessToken,
        propertyId,
        startDate,
        endDate,
        ['eventName'],
        ['eventCount']
      );

      const rows = report.rows || [];

      // Filter out standard GA4 events to show only custom events
      const standardEvents = [
        'page_view', 'session_start', 'scroll', 'click', 'user_engagement',
        'first_visit', 'purchase', 'begin_checkout', 'view_item', 'add_to_cart'
      ];

      const customEvents = rows
        .filter(row => !standardEvents.includes(row.dimensionValues[0]?.value))
        .map(row => ({
          name: row.dimensionValues[0]?.value || 'unknown',
          count: parseInt(row.metricValues[0]?.value || 0)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20); // Top 20 custom events

      return {
        success: true,
        data: { events: customEvents }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createCustomEvent(userId, propertyId, eventData) {
    try {
      // Note: Google Analytics doesn't allow creating custom events through the API
      // Custom events are sent from your website/app using gtag or Measurement Protocol
      // This method provides guidance on implementing custom events

      return {
        success: true,
        data: {
          eventId: 'evt_' + Date.now(),
          ...eventData,
          implementation: {
            message: 'Custom events cannot be created via API. Implement on your website using:',
            gtagExample: `gtag('event', '${eventData.name}', { /* parameters */ })`,
            measurementProtocolExample: 'Use Measurement Protocol v2 to send events',
            note: 'Event will appear in analytics after it\'s triggered on your site'
          }
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getCustomKPIs(userId, propertyId, startDate, endDate) {
    try {
      const accessToken = await this.getAnalyticsToken(userId);

      // Get various metrics for KPI calculation
      const report = await this.authenticator.runGoogleAnalyticsReport(
        accessToken,
        propertyId,
        startDate,
        endDate,
        [],
        ['bounceRate', 'averageSessionDuration', 'engagedSessions', 'sessions']
      );

      const metrics = report.rows?.[0]?.metricValues || [];

      const bounceRate = parseFloat(metrics[0]?.value || 0) * 100;
      const avgSessionDuration = parseFloat(metrics[1]?.value || 0);
      const engagedSessions = parseInt(metrics[2]?.value || 0);
      const totalSessions = parseInt(metrics[3]?.value || 0);

      const engagementRate = totalSessions > 0 ? (engagedSessions / totalSessions) * 100 : 0;

      const kpis = [
        {
          name: 'Engagement Rate',
          value: Math.round(engagementRate * 100) / 100,
          target: 70,
          status: engagementRate >= 70 ? 'good' : 'needs_improvement'
        },
        {
          name: 'Bounce Rate',
          value: Math.round(bounceRate * 100) / 100,
          target: 30,
          status: bounceRate <= 30 ? 'good' : 'needs_improvement'
        },
        {
          name: 'Average Session Duration',
          value: Math.round(avgSessionDuration * 100) / 100,
          target: 180,
          status: avgSessionDuration >= 180 ? 'good' : 'needs_improvement'
        }
      ];

      return {
        success: true,
        data: { kpis }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ===========================================
  // USER SEGMENTS
  // ===========================================

  async getSegments(userId, propertyId) {
    try {
      const accessToken = await this.getAnalyticsToken(userId);

      // Get audience data by device category and new vs returning
      const report = await this.authenticator.runGoogleAnalyticsReport(
        accessToken,
        propertyId,
        '30daysAgo', // Default to last 30 days
        'today',
        ['deviceCategory', 'newVsReturning'],
        ['totalUsers']
      );

      const rows = report.rows || [];
      const segments = rows.map((row, index) => ({
        id: `seg_${index + 1}`,
        name: `${row.dimensionValues[0]?.value || 'Unknown'} ${row.dimensionValues[1]?.value || 'Users'}`,
        size: parseInt(row.metricValues[0]?.value || 0),
        criteria: {
          deviceCategory: row.dimensionValues[0]?.value,
          userType: row.dimensionValues[1]?.value
        }
      }));

      return {
        success: true,
        data: { segments }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createSegment(userId, propertyId, segmentData) {
    try {
      // Note: Google Analytics segments are created in the UI, not via API
      // This method provides guidance on creating segments

      return {
        success: true,
        data: {
          segmentId: 'seg_' + Date.now(),
          ...segmentData,
          implementation: {
            message: 'Segments must be created in Google Analytics UI. Go to:',
            steps: [
              'Navigate to your GA4 property',
              'Go to Audience > Audiences',
              'Click "Create Audience"',
              'Define your audience conditions',
              'Save the audience'
            ],
            note: 'Once created in UI, you can access audience data via the API'
          }
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ===========================================
  // TRAFFIC DETAILS
  // ===========================================

  async getTrafficSources(userId, propertyId, startDate, endDate) {
    try {
      const accessToken = await this.getAnalyticsToken(userId);

      // Get traffic sources
      const report = await this.authenticator.runGoogleAnalyticsReport(
        accessToken,
        propertyId,
        startDate,
        endDate,
        ['sessionDefaultChannelGroup', 'sessionSource'],
        ['sessions']
      );

      const rows = report.rows || [];
      const totalSessions = rows.reduce((sum, row) => sum + parseInt(row.metricValues[0]?.value || 0), 0);

      const sources = rows.map(row => {
        const sessions = parseInt(row.metricValues[0]?.value || 0);
        const percentage = totalSessions > 0 ? (sessions / totalSessions) * 100 : 0;

        return {
          source: row.dimensionValues[1]?.value || 'unknown',
          channel: row.dimensionValues[0]?.value || 'unknown',
          sessions,
          percentage: Math.round(percentage * 100) / 100
        };
      });

      return {
        success: true,
        data: { sources }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getLandingPages(userId, propertyId, startDate, endDate) {
    try {
      const accessToken = await this.getAnalyticsToken(userId);

      // Get landing pages performance
      const report = await this.authenticator.runGoogleAnalyticsReport(
        accessToken,
        propertyId,
        startDate,
        endDate,
        ['landingPage'],
        ['sessions', 'bounceRate']
      );

      const rows = report.rows || [];
      const pages = rows
        .slice(0, 20) // Top 20 landing pages
        .map(row => ({
          url: row.dimensionValues[0]?.value || 'unknown',
          sessions: parseInt(row.metricValues[0]?.value || 0),
          bounceRate: Math.round(parseFloat(row.metricValues[1]?.value || 0) * 100 * 100) / 100
        }))
        .sort((a, b) => b.sessions - a.sessions);

      return {
        success: true,
        data: { pages }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getExitPages(userId, propertyId, startDate, endDate) {
    try {
      const accessToken = await this.getAnalyticsToken(userId);

      // Get exit pages performance
      const report = await this.authenticator.runGoogleAnalyticsReport(
        accessToken,
        propertyId,
        startDate,
        endDate,
        ['exitPage'],
        ['exits', 'exitRate']
      );

      const rows = report.rows || [];
      const pages = rows
        .slice(0, 20) // Top 20 exit pages
        .map(row => ({
          url: row.dimensionValues[0]?.value || 'unknown',
          exits: parseInt(row.metricValues[0]?.value || 0),
          exitRate: Math.round(parseFloat(row.metricValues[1]?.value || 0) * 100 * 100) / 100
        }))
        .sort((a, b) => b.exits - a.exits);

      return {
        success: true,
        data: { pages }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ===========================================
  // ENGAGEMENT
  // ===========================================

  async getEngagementFrequency(userId, propertyId, startDate, endDate) {
    try {
      const accessToken = await this.getAnalyticsToken(userId);

      // Get user engagement by session count
      const report = await this.authenticator.runGoogleAnalyticsReport(
        accessToken,
        propertyId,
        startDate,
        endDate,
        ['sessionCount'],
        ['totalUsers']
      );

      const rows = report.rows || [];
      const frequency = rows.map(row => ({
        visits: parseInt(row.dimensionValues[0]?.value || 0),
        users: parseInt(row.metricValues[0]?.value || 0)
      }));

      // Calculate average frequency
      const totalUsers = frequency.reduce((sum, item) => sum + item.users, 0);
      const weightedSum = frequency.reduce((sum, item) => sum + (item.visits * item.users), 0);
      const averageFrequency = totalUsers > 0 ? Math.round((weightedSum / totalUsers) * 100) / 100 : 0;

      return {
        success: true,
        data: {
          frequency,
          averageFrequency
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getEngagementRecency(userId, propertyId, startDate, endDate) {
    try {
      const accessToken = await this.getAnalyticsToken(userId);

      // Get user engagement by days since last visit
      const report = await this.authenticator.runGoogleAnalyticsReport(
        accessToken,
        propertyId,
        startDate,
        endDate,
        ['daysSinceLastSession'],
        ['totalUsers']
      );

      const rows = report.rows || [];
      const recency = rows.map(row => ({
        days: parseInt(row.dimensionValues[0]?.value || 0),
        users: parseInt(row.metricValues[0]?.value || 0)
      }));

      // Calculate average recency
      const totalUsers = recency.reduce((sum, item) => sum + item.users, 0);
      const weightedSum = recency.reduce((sum, item) => sum + (item.days * item.users), 0);
      const averageRecency = totalUsers > 0 ? Math.round((weightedSum / totalUsers) * 100) / 100 : 0;

      return {
        success: true,
        data: {
          recency,
          averageRecency
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getScrollDepth(userId, propertyId, startDate, endDate) {
    try {
      const accessToken = await this.getAnalyticsToken(userId);

      // Get scroll depth data (assumes custom events for scroll tracking)
      const report = await this.authenticator.runGoogleAnalyticsReport(
        accessToken,
        propertyId,
        startDate,
        endDate,
        ['eventName'],
        ['eventCount', 'totalUsers']
      );

      const rows = report.rows || [];

      // Look for scroll-related events
      const scrollEvents = rows.filter(row =>
        row.dimensionValues[0]?.value?.includes('scroll') ||
        row.dimensionValues[0]?.value?.includes('Scroll')
      );

      // If no scroll events found, return default structure
      if (scrollEvents.length === 0) {
        return {
          success: true,
          data: {
            depth: [
              { percentage: 25, users: 0 },
              { percentage: 50, users: 0 },
              { percentage: 75, users: 0 },
              { percentage: 100, users: 0 }
            ],
            averageDepth: 0,
            note: 'No scroll tracking events found. Implement scroll tracking on your website.'
          }
        };
      }

      // Process scroll events to estimate depth
      const depthMap = { 25: 0, 50: 0, 75: 0, 100: 0 };
      let totalScrollEvents = 0;

      scrollEvents.forEach(row => {
        const eventName = row.dimensionValues[0]?.value || '';
        const users = parseInt(row.metricValues[1]?.value || 0);

        // Parse scroll percentages from event names
        const scrollMatch = eventName.match(/scroll_(\d+)/);
        if (scrollMatch) {
          const percentage = parseInt(scrollMatch[1]);
          if (depthMap.hasOwnProperty(percentage)) {
            depthMap[percentage] += users;
          }
        }
        totalScrollEvents += users;
      });

      const depth = Object.entries(depthMap).map(([percentage, users]) => ({
        percentage: parseInt(percentage),
        users
      }));

      // Calculate average depth (weighted average)
      const weightedSum = depth.reduce((sum, item) => sum + (item.percentage * item.users), 0);
      const averageDepth = totalScrollEvents > 0 ? Math.round((weightedSum / totalScrollEvents) * 100) / 100 : 0;

      return {
        success: true,
        data: {
          depth,
          averageDepth
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = AnalyticsService;

