const ConnectedAccount = require('../models/ConnectedAccount');
const AdsToken = require('../models/AdsToken');

class AuthService {
  // Get access token for a user and platform
  async getAccessToken(userId, platform) {
    try {
      const token = await AdsToken.findByUserAndPlatform(userId, platform);

      if (!token) {
        throw new Error(`No ${platform} token found for user`);
      }

      if (token.expiry_date && Date.now() >= new Date(token.expiry_date).getTime()) {
        throw new Error(`${platform} token expired. Please re-authenticate.`);
      }

      return token.access_token;
    } catch (error) {
      throw error;
    }
  }

  // Fetch tokens for a user and platform
  async fetchTokens(userId, platform) {
    try {
      const token = await AdsToken.findByUserAndPlatform(userId, platform);
      if (!token) {
        throw new Error(`No tokens found for user ${userId} on platform ${platform}`);
      }
      return [token];
    } catch (error) {
      throw error;
    }
  }

  // Store or update access token for a user
  async storeAccessToken(userId, platform, tokenData) {
    try {
      return await AdsToken.upsert({
        user_id: userId,
        platform,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expiry_date: tokenData.expiry_date,
        token_type: tokenData.token_type,
        scope: tokenData.scope
      });
    } catch (error) {
      throw error;
    }
  }

  // Fetch ads accounts for a user via tokens
  async fetchAdsAccounts(userId, platform) {
    try {
      const accounts = await ConnectedAccount.findByUserAndPlatform(userId, platform);
      if (accounts.length === 0) {
        throw new Error(`No ${platform} accounts found for user`);
      }
      return accounts.map(acc => acc.toJSON());
    } catch (error) {
      throw error;
    }
  }

  // Check if user has accounts for a platform
  async userHasAccounts(userId, platform) {
    try {
      const accounts = await ConnectedAccount.findByUserAndPlatform(userId, platform);
      return accounts.length > 0;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AuthService();
