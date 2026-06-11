const nock = require('nock');

const mockGoogleAdsApi = () => {
  const scope = nock('https://googleads.googleapis.com/v16')
    .persist();

  // Mock list accessible customers
  scope
    .get('/customers:listAccessibleCustomers')
    .reply(200, {
      resourceNames: [
        'customers/1234567890'
      ]
    });

  // Mock search reports (campaigns)
  scope
    .post('/customers/1234567890/googleAds:search')
    .reply(200, [
      {
        campaign: {
          id: 'camp_gg_111',
          name: 'Google Search Promo',
          status: 'ENABLED',
          advertisingChannelType: 'SEARCH',
          biddingStrategyType: 'MANUAL_CPC',
          budget: 'customers/1234567890/campaignBudgets/555',
          startDate: '2026-05-01',
          endDate: '2026-05-30'
        },
        metrics: {
          impressions: '12000',
          clicks: '650',
          costMicros: '250000000',
          conversions: '35',
          conversionsValue: '750.0'
        }
      }
    ]);

  // Mock create campaign
  scope
    .post('/customers/1234567890/campaigns:mutate')
    .reply(200, {
      results: [
        {
          resourceName: 'customers/1234567890/campaigns/camp_gg_new'
        }
      ]
    });

  return scope;
};

module.exports = { mockGoogleAdsApi };
