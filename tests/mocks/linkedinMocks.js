const nock = require('nock');

const mockLinkedInApi = () => {
  const scope = nock('https://api.linkedin.com')
    .persist();

  // Mock reporting endpoint
  scope
    .get('/rest/adAnalytics')
    .query(true)
    .reply(200, {
      elements: [
        {
          pivotValue: 'urn:li:sponsoredCampaign:camp_li_111',
          dateRange: {
            start: {
              year: 2026,
              month: 5,
              day: 15
            }
          },
          impressions: 4500,
          clicks: 120,
          costInLocalCurrency: '120.00',
          externalWebsiteConversions: 8
        }
      ]
    });

  return scope;
};

module.exports = { mockLinkedInApi };
