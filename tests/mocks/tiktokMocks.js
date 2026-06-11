const nock = require('nock');

const mockTikTokApi = () => {
  const scope = nock('https://business-api.tiktok.com/open_api/v1.3')
    .persist();

  // Mock reporting endpoint
  scope
    .get('/report/integrated/get/')
    .query(true)
    .reply(200, {
      code: 0,
      message: 'OK',
      data: {
        list: [
          {
            dimensions: {
              campaign_id: 'camp_tt_111',
              stat_time_day: '2026-05-15'
            },
            metrics: {
              campaign_name: 'TikTok Promo Campaign',
              spend: '75.50',
              impressions: '8000',
              clicks: '350',
              conversion: '15'
            }
          }
        ]
      }
    });

  return scope;
};

module.exports = { mockTikTokApi };
