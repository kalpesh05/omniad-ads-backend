const AdsAccount = require('../models/AdsAccount');

class AuthService {
  // Get access token for a user and platform
  async getAccessToken(userId, platform) {
    try {
      const accounts = await AdsAccount.findByUserAndPlatform(userId, platform);
      
      if (accounts.length === 0) {
        throw new Error(`No ${platform} account found for user`);
      }

      // For now, return the first account's token
      // In production, you might want to handle multiple accounts differently
      const account = accounts[0];
      
      // Check if token is expired and refresh if needed
      if (account.token_expires_at && new Date() >= new Date(account.token_expires_at)) {
        // Token refresh logic would go here
        // For now, throw an error
        throw new Error(`${platform} token expired. Please re-authenticate.`);
      }

      return account.access_token;
    } catch (error) {
      throw error;
    }
  }

  // Store or update access token
  async storeAccessToken(userId, platform, tokenData) {
    try {
      const existingAccounts = await AdsAccount.findByUserAndPlatform(userId, platform);
      
      if (existingAccounts.length > 0) {
        // Update existing account
        const account = existingAccounts[0];
        return await account.update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: tokenData.expires_at
        });
      } else {
        // Create new account
        return await AdsAccount.create({
          user_id: userId,
          platform: platform,
          account_id: tokenData.account_id,
          account_name: tokenData.account_name,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: tokenData.expires_at
        });
      }
    } catch (error) {
      throw error;
    }
  }
  
  // check if user has accounts for a platform
  async userHasAccounts(userId, platform) { 
    try {
      const accounts = await AdsAccount.findByUserAndPlatform(userId, platform);
      return accounts.length > 0;
    } catch (error) {
      throw error;
    }
  }               
}

module.exports = new AuthService();