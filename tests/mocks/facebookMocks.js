const nock = require('nock');

const mockFacebookApi = () => {
  const scope = nock('https://graph.facebook.com/v18.0')
    .persist();

  // Mock get ad accounts
  scope
    .get('/me/adaccounts')
    .query(true)
    .reply(200, {
      data: [
        {
          id: 'act_123456789',
          name: 'Test Facebook Ad Account',
          account_status: 1,
          currency: 'USD',
          timezone_name: 'America/New_York',
          amount_spent: '150000',
          balance: '0'
        }
      ]
    });

  // Mock get campaigns
  scope
    .get('/act_123456789/campaigns')
    .query(true)
    .reply(200, {
      data: [
        {
          id: 'camp_fb_111',
          name: 'FB Promo Campaign',
          status: 'ACTIVE',
          objective: 'OUTCOME_TRAFFIC',
          created_time: '2026-05-01T10:00:00Z',
          start_time: '2026-05-01T10:00:00Z',
          daily_budget: '5000'
        }
      ]
    });

  // Mock create campaign
  scope
    .post('/act_123456789/campaigns')
    .reply(200, {
      id: 'camp_fb_new',
      success: true
    });

  // Mock update campaign
  scope
    .post('/camp_fb_111')
    .reply(200, {
      success: true
    });

  return scope;
};

module.exports = { mockFacebookApi };
