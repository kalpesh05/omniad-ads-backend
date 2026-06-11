const { setupMockAdServers, cleanMockAdServers } = require('./mocks/mockAdServer');
const DataSyncService = require('../services/dataSyncService');
const AdsManagerFactory = require('../services/adsManagerFactory');
const prisma = require('../config/prisma');
const { pool } = require('../config/database');

let testUserId;

describe('Data Synchronization Ingestion Pipeline', () => {
  beforeAll(async () => {
    // Setup nock intercepts
    setupMockAdServers();

    // Clean tables before running tests
    await pool.execute('DELETE FROM ads_insights');
    await pool.execute('DELETE FROM ads_creatives');
    await pool.execute('DELETE FROM ads_campaigns');
    await pool.execute('DELETE FROM connected_accounts');
    await pool.execute('DELETE FROM ads_accounts');
    await pool.execute('DELETE FROM ads_tokens');
    await pool.execute('DELETE FROM users WHERE email = "test_sync@example.com"');

    // Create a mock user
    const [userResult] = await pool.execute(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      ['test_sync_user', 'test_sync@example.com', 'hashed_pw', 'user']
    );
    testUserId = userResult.insertId;

    // Seed TikTok token & account
    const [tokenResult] = await pool.execute(
      'INSERT INTO ads_tokens (user_id, platform, access_token, expiry_date) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 YEAR))',
      [testUserId, 'tiktok', 'mock_tiktok_token']
    );
    const tokenId = tokenResult.insertId;

    await pool.execute(
      'INSERT INTO connected_accounts (id, token_id, account_id, account_name, platform) VALUES (?, ?, ?, ?, ?)',
      [1001, tokenId, 'act_tiktok_123', 'TikTok Test Account', 'tiktok']
    );
    await pool.execute(
      'INSERT INTO ads_accounts (id, token_id, account_id, account_name) VALUES (?, ?, ?, ?)',
      [1001, tokenId, 'act_tiktok_123', 'TikTok Test Account']
    );

    // Seed LinkedIn token & account
    const [liTokenResult] = await pool.execute(
      'INSERT INTO ads_tokens (user_id, platform, access_token, expiry_date) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 YEAR))',
      [testUserId, 'linkedin', 'mock_linkedin_token']
    );
    const liTokenId = liTokenResult.insertId;

    await pool.execute(
      'INSERT INTO connected_accounts (id, token_id, account_id, account_name, platform) VALUES (?, ?, ?, ?, ?)',
      [1002, liTokenId, 'act_linkedin_123', 'LinkedIn Test Account', 'linkedin']
    );
    await pool.execute(
      'INSERT INTO ads_accounts (id, token_id, account_id, account_name) VALUES (?, ?, ?, ?)',
      [1002, liTokenId, 'act_linkedin_123', 'LinkedIn Test Account']
    );

    // Seed Facebook token & account
    const [fbTokenResult] = await pool.execute(
      'INSERT INTO ads_tokens (user_id, platform, access_token, expiry_date) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 YEAR))',
      [testUserId, 'facebook', 'mock_facebook_token']
    );
    const fbTokenId = fbTokenResult.insertId;

    await pool.execute(
      'INSERT INTO connected_accounts (id, token_id, account_id, account_name, platform) VALUES (?, ?, ?, ?, ?)',
      [1003, fbTokenId, 'act_123456789', 'Test Facebook Ad Account', 'facebook']
    );
    await pool.execute(
      'INSERT INTO ads_accounts (id, token_id, account_id, account_name) VALUES (?, ?, ?, ?)',
      [1003, fbTokenId, 'act_123456789', 'Test Facebook Ad Account']
    );

    // Seed Google Ads token & account
    const [ggTokenResult] = await pool.execute(
      'INSERT INTO ads_tokens (user_id, platform, access_token, expiry_date) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 YEAR))',
      [testUserId, 'google', 'mock_google_token']
    );
    const ggTokenId = ggTokenResult.insertId;

    await pool.execute(
      'INSERT INTO connected_accounts (id, token_id, account_id, account_name, platform) VALUES (?, ?, ?, ?, ?)',
      [1004, ggTokenId, '1234567890', 'Test Google Ad Account', 'google']
    );
    await pool.execute(
      'INSERT INTO ads_accounts (id, token_id, account_id, account_name) VALUES (?, ?, ?, ?)',
      [1004, ggTokenId, '1234567890', 'Test Google Ad Account']
    );
  });

  afterAll(async () => {
    // Clean up nock mock servers
    cleanMockAdServers();

    // Clean test data from DB
    await pool.execute('DELETE FROM ads_insights');
    await pool.execute('DELETE FROM ads_campaigns');
    await pool.execute('DELETE FROM connected_accounts');
    await pool.execute('DELETE FROM ads_accounts');
    await pool.execute('DELETE FROM ads_tokens');
    await pool.execute('DELETE FROM users WHERE email = "test_sync@example.com"');
    
    // Close DB pools
    await pool.end();
  });

  describe('Facebook Ads API Mock Connection', () => {
    it('should successfully retrieve Facebook ad accounts from mocked Graph API', async () => {
      const manager = AdsManagerFactory.createManager('facebook');
      const response = await manager.getAdAccounts(testUserId);
      expect(response.success).toBe(true);
      expect(response.data.data[0].id).toBe('act_123456789');
      expect(response.data.data[0].name).toBe('Test Facebook Ad Account');
    });

    it('should successfully retrieve campaigns from mocked Facebook Graph API', async () => {
      const manager = AdsManagerFactory.createManager('facebook');
      const response = await manager.getCampaigns(testUserId, 'act_123456789');
      expect(response.success).toBe(true);
      expect(response.data.data[0].id).toBe('camp_fb_111');
      expect(response.data.data[0].name).toBe('FB Promo Campaign');
    });
  });

  describe('Google Ads API Mock Connection', () => {
    it('should successfully list accessible customer accounts from mocked Google API', async () => {
      const manager = AdsManagerFactory.createManager('google');
      const response = await manager.getAdAccounts(testUserId);
      expect(response.success).toBe(true);
      expect(response.data.resourceNames[0]).toBe('customers/1234567890');
    });

    it('should retrieve campaigns and insights from mocked Google search report', async () => {
      const manager = AdsManagerFactory.createManager('google');
      const response = await manager.getCampaigns(testUserId, '1234567890');
      expect(response.success).toBe(true);
      expect(response.data[0].campaign.id).toBe('camp_gg_111');
      expect(response.data[0].metrics.impressions).toBe('12000');
    });
  });

  describe('DataSyncService Ingestion Workflows', () => {
    it('should sync TikTok reporting data and write campaigns/insights to MySQL via Prisma', async () => {
      // Execute the sync TikTok data method directly
      await DataSyncService.syncTikTokData('mock_tiktok_token', 'act_tiktok_123', 1001);

      // Verify campaigns count in DB
      const campaigns = await prisma.ads_campaigns.findMany({
        where: { account_id: 1001 }
      });
      expect(campaigns.length).toBe(1);
      expect(campaigns[0].campaign_id).toBe('camp_tt_111');
      expect(campaigns[0].campaign_name).toBe('TikTok Promo Campaign');

      // Verify insights count in DB
      const insights = await prisma.ads_insights.findMany({
        where: { campaign_id: campaigns[0].id }
      });
      expect(insights.length).toBe(1);
      expect(insights[0].impressions).toBe(8000);
      expect(insights[0].clicks).toBe(350);
      expect(insights[0].spend.toString()).toBe('75.5');
    });

    it('should sync LinkedIn reporting data and write campaigns/insights to MySQL via Prisma', async () => {
      // Execute LinkedIn sync
      await DataSyncService.syncLinkedInData('mock_linkedin_token', 'act_linkedin_123', 1002);

      // Verify campaigns count
      const campaigns = await prisma.ads_campaigns.findMany({
        where: { account_id: 1002 }
      });
      expect(campaigns.length).toBe(1);
      expect(campaigns[0].campaign_id).toBe('urn:li:sponsoredCampaign:camp_li_111');

      // Verify insights count
      const insights = await prisma.ads_insights.findMany({
        where: { campaign_id: campaigns[0].id }
      });
      expect(insights.length).toBe(1);
      expect(insights[0].impressions).toBe(4500);
      expect(insights[0].clicks).toBe(120);
      expect(insights[0].spend.toString()).toBe('120');
    });
  });
});
