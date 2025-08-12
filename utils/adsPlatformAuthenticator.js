// Complete AdPlatformAuthenticator - Latest Version with Auto-Refresh
// Multi-Platform Advertisement Authentication System
// Supports Google Ads, Facebook/Meta, Instagram, and YouTube
const AdsToken = require('../models/AdsToken'); // Adjust the path as needed


class AdPlatformAuthenticator {
  constructor() {
    this.platforms = {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI,
        scopes: [
          "openid",
          "email",
          "profile",
          'https://www.googleapis.com/auth/adwords',
          'https://www.googleapis.com/auth/youtube',
          'https://www.googleapis.com/auth/youtube.readonly',
          'https://www.googleapis.com/auth/analytics',
          'https://www.googleapis.com/auth/analytics.readonly'
        ],
        authUrl: 'https://accounts.google.com/o/oauth2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token'
      },
      facebook: {
        clientId: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        redirectUri: process.env.FACEBOOK_REDIRECT_URI,
        scopes: [
          'ads_management',
          'ads_read',
          'business_management',
          'instagram_basic',
          'instagram_manage_insights',
          'pages_read_engagement',
          'pages_manage_ads',
          'pages_manage_metadata'
        ],
        authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token'
      },
      meta: {
        // Meta uses same credentials as Facebook
        clientId: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        redirectUri: process.env.FACEBOOK_REDIRECT_URI,
        scopes: [
          'ads_management',
          'ads_read',
          'business_management',
          'catalog_management',
          'pages_manage_ads'
        ],
        authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token'
      },
      instagram: {
        // Instagram ads managed through Facebook
        clientId: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        redirectUri: process.env.FACEBOOK_REDIRECT_URI,
        scopes: [
          'instagram_basic',
          'instagram_content_publish',
          'instagram_manage_insights',
          'ads_management',
          'ads_read',
          'pages_read_engagement'
        ],
        authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token'
      }
    };
    
    this.authCases = {
      GOOGLE_ADS_ONLY: ['google'],
      FACEBOOK_ADS_ONLY: ['facebook'],
      INSTAGRAM_ADS_ONLY: ['instagram'],
      YOUTUBE_ADS_ONLY: ['google'], // YouTube ads managed through Google
      SOCIAL_MEDIA_SUITE: ['facebook', 'instagram', 'google'],
      ALL_PLATFORMS: ['google', 'facebook', 'instagram'],
      GOOGLE_ECOSYSTEM: ['google'],
      META_ECOSYSTEM: ['facebook', 'instagram'],
      SEARCH_ONLY: ['google'],
      SOCIAL_ONLY: ['facebook', 'instagram'],
      CROSS_PLATFORM: ['google', 'facebook', 'instagram']
    };

    // Token refresh configuration
    this.refreshConfig = {
      bufferMinutes: 10, // Refresh 10 minutes before expiry
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      timeoutMs: 10000 // 10 second timeout
    };
  }

  // ===========================================
  // AUTHENTICATION URL GENERATION
  // ===========================================

  // Generate authentication URL based on case
  generateAuthUrl(authCase, userId, state = null) {
    const platforms = this.authCases[authCase];
    if (!platforms) {
      throw new Error(`Invalid authentication case: ${authCase}`);
    }

    const authUrls = {};
    const stateParam = state || this.generateState(userId, authCase);

    platforms.forEach(platform => {
      const config = this.platforms[platform];
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: config.scopes.join(' '),
        response_type: 'code',
        state: `${platform}:${stateParam}`,
        access_type: 'offline', // For Google to get refresh token
        prompt: 'consent' // Force consent screen
      });

      authUrls[platform] = `${config.authUrl}?${params.toString()}`;
    });

    return authUrls;
  }

  // Generate single platform auth URL
  generateSinglePlatformAuthUrl(platform, userId, customScopes = null) {
    const config = this.platforms[platform];
    if (!config) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const scopes = customScopes || config.scopes;
    const stateParam = this.generateState(userId, platform.toUpperCase());

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: scopes.join(' '),
      response_type: 'code',
      state: `${platform}:${stateParam}`,
      access_type: 'offline',
      prompt: 'consent'
    });

    return `${config.authUrl}?${params.toString()}`;
  }

  // ===========================================
  // OAUTH CALLBACK HANDLING
  // ===========================================

  // Handle OAuth callback
  async handleCallback(platform, code, state, userId) {
    const config = this.platforms[platform];
    if (!config) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    try {
      // Verify state parameter
      if (!this.verifyState(state, userId)) {
        throw new Error('Invalid state parameter - possible CSRF attack');
      }

      // Exchange code for access token
      const tokenData = await this.exchangeCodeForToken(platform, code);
      
      // Add metadata for tracking
      tokenData.platform = platform;
      tokenData.obtained_at = new Date().toISOString();
      tokenData.user_id = userId;
      
      // Calculate expiry timestamp if not provided
      if (tokenData.expires_in && !tokenData.expires_at) {
        const expiryDate = new Date(Date.now() + (tokenData.expires_in * 1000));
        tokenData.expires_at = expiryDate.toISOString();
      }
      
      // Store tokens securely
      await this.storeTokens(userId, platform, tokenData);
      console.log(`Successfully authenticated ${platform} for user ${userId}`,tokenData);
      // Get user info and permissions
      const userInfo = await this.getUserInfo(platform, tokenData.access_token);
      console.log("::: userInfo:", userInfo);
      const permissions = await this.getPermissions(platform, tokenData.access_token);
      
      return {
        success: true,
        platform,
        userInfo,
        permissions,
        tokenData: {
          refresh_token: tokenData.refresh_token,
          access_token: tokenData.access_token,
          expiry_date: tokenData.expires_at,
          token_type: tokenData.token_type,
          scope: tokenData.scope,
          has_refresh_token: !!tokenData.refresh_token
        }
      };
    } catch (error) {
      console.error(`Authentication failed for ${platform}:`, error);
      throw error;
    }
  }

  // ===========================================
  // TOKEN EXCHANGE
  // ===========================================

  // Exchange authorization code for access token
  async exchangeCodeForToken(platform, code) {
    const config = this.platforms[platform];
    
    const params = {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.refreshConfig.timeoutMs);

    try {
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams(params),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
      }

      const tokenData = await response.json();
      
      if (tokenData.error) {
        throw new Error(`OAuth Error: ${tokenData.error_description || tokenData.error}`);
      }

      return tokenData;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Token exchange request timed out');
      }
      throw error;
    }
  }

  // ===========================================
  // TOKEN REFRESH FUNCTIONALITY
  // ===========================================

  // Refresh access token
  async refreshToken(userId, platform) {
    const storedTokens = await this.getStoredTokens(userId, platform);
    if (!storedTokens.refresh_token) {
      throw new Error('No refresh token available. User needs to re-authenticate.');
    }

    const config = this.platforms[platform];
    let lastError;

    // Retry logic
    for (let attempt = 1; attempt <= this.refreshConfig.maxRetries; attempt++) {
      try {
        console.log(`Refreshing ${platform} token for user ${userId} (attempt ${attempt})`);
        
        const params = {
          client_id: config.clientId,
          client_secret: config.clientSecret,
          refresh_token: storedTokens.refresh_token,
          grant_type: 'refresh_token'
        };

        // Platform-specific adjustments
        if (platform === 'facebook' || platform === 'meta' || platform === 'instagram') {
          params.fb_exchange_token = storedTokens.refresh_token;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.refreshConfig.timeoutMs);

        const response = await fetch(config.tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: new URLSearchParams(params),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
        }

        const tokenData = await response.json();
        
        if (tokenData.error) {
          throw new Error(`Refresh Error: ${tokenData.error_description || tokenData.error}`);
        }
        
        // Preserve refresh token if not provided in response
        if (!tokenData.refresh_token && storedTokens.refresh_token) {
          tokenData.refresh_token = storedTokens.refresh_token;
        }
        
        // Add metadata for tracking
        tokenData.platform = platform;
        tokenData.refreshed_at = new Date().toISOString();
        tokenData.user_id = userId;
        
        // Calculate new expiry timestamp
        if (tokenData.expires_in) {
          const expiryDate = new Date(Date.now() + (tokenData.expires_in * 1000));
          tokenData.expires_at = expiryDate.toISOString();
        }
        
        await this.storeTokens(userId, platform, tokenData);
        
        console.log(`Successfully refreshed ${platform} token for user ${userId}`);
        return tokenData;
        
      } catch (error) {
        lastError = error;
        console.error(`Token refresh attempt ${attempt} failed:`, error.message);
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          break;
        }
        
        // Wait before retry
        if (attempt < this.refreshConfig.maxRetries) {
          await this.delay(this.refreshConfig.retryDelay * attempt);
        }
      }
    }

    // All attempts failed
    await this.markForReauth(userId, platform);
    throw lastError;
  }

  // Check if token needs refresh (refresh 10 minutes before expiry)
  isTokenExpiringSoon(tokenData, bufferMinutes = null) {
    const buffer = bufferMinutes || this.refreshConfig.bufferMinutes;
    
    if (!tokenData.expires_at) {
      return true; // Assume needs refresh if no expiry info
    }
    
    const expiryTime = new Date(tokenData.expires_at);
    const bufferTime = new Date(Date.now() + (buffer * 60 * 1000));
    
    return expiryTime <= bufferTime;
  }

  // Get valid access token (refresh if needed)
  async getValidAccessToken(userId, platform) {
    const storedTokens = await this.getStoredTokens(userId, platform);
    
    if (!storedTokens.access_token) {
      throw new Error('No access token found. User needs to re-authenticate.');
    }

    // Check if token needs refresh
    if (this.isTokenExpiringSoon(storedTokens)) {
      console.log(`Token expiring soon, refreshing for user ${userId}:${platform}`);
      try {
        const refreshedTokens = await this.refreshToken(userId, platform);
        return refreshedTokens.access_token;
      } catch (error) {
        console.error(`Failed to refresh token for ${userId}:${platform}`, error);
        throw new Error('Token refresh failed. User needs to re-authenticate.');
      }
    }

    return storedTokens.access_token;
  }

  // Bulk refresh tokens for multiple platforms
  async refreshAllUserTokens(userId, platforms = null) {
    if (!platforms) {
      platforms = Object.keys(this.platforms);
    }

    const results = {};
    const errors = {};

    for (const platform of platforms) {
      try {
        const storedTokens = await this.getStoredTokens(userId, platform);
        
        if (!storedTokens.access_token) {
          continue; // Skip if no token exists
        }
        
        if (this.isTokenExpiringSoon(storedTokens)) {
          results[platform] = await this.refreshToken(userId, platform);
        } else {
          results[platform] = { 
            status: 'still_valid', 
            expires_at: storedTokens.expires_at,
            access_token: storedTokens.access_token
          };
        }
      } catch (error) {
        errors[platform] = error.message;
      }
    }

    return { results, errors };
  }

  // ===========================================
  // USER INFO & PERMISSIONS
  // ===========================================

  // Get user information from platform
  async getUserInfo(platform, accessToken) {
    try {
      switch (platform) {
        case 'google':
          return await this.getGoogleUserInfo(accessToken);
        case 'facebook':
        case 'meta':
        case 'instagram':
          return await this.getFacebookUserInfo(accessToken);
        default:
          throw new Error(`User info not implemented for ${platform}`);
      }
    } catch (error) {
      console.error(`Failed to get user info for ${platform}:`, error);
      return { error: error.message };
    }
  }

  async getGoogleUserInfo(accessToken) {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) {
      throw new Error(`Google user info failed: ${response.status}`);
    }
    
    return await response.json();
  }

  async getFacebookUserInfo(accessToken) {
    const response = await fetch(
      `https://graph.facebook.com/me?access_token=${accessToken}&fields=id,name,email,picture`
    );
    
    if (!response.ok) {
      throw new Error(`Facebook user info failed: ${response.status}`);
    }
    
    return await response.json();
  }

  // Get available ad accounts and permissions
  async getPermissions(platform, accessToken) {
    try {
      switch (platform) {
        case 'google':
          return await this.getGoogleAdAccounts(accessToken);
        case 'facebook':
        case 'meta':
        case 'instagram':
          return await this.getFacebookAdAccounts(accessToken);
        default:
          return {};
      }
    } catch (error) {
      console.error(`Failed to get permissions for ${platform}:`, error);
      return { error: error.message };
    }
  }

  async getGoogleAdAccounts(accessToken) {
    try {
      const response = await fetch(
        'https://googleads.googleapis.com/v16/customers:listAccessibleCustomers',
        {
          headers: { 
            Authorization: `Bearer ${accessToken}`,
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || ''
          }
        }
      );
      console.log("::: response:", response) 
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log("::: error response:", errorText);
        
        // Handle specific case where user has no ad accounts
        if ([400, 403, 404].includes(response.status)) {
          console.log("User may not have any ad accounts or proper permissions");
          return {
            adAccounts: [],
            hasYouTubeAccess: true,
            totalAccounts: 0,
            message: "No ad accounts found or insufficient permissions"
          };
        }
        
        throw new Error(`Google Ads API failed: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      return {
        adAccounts: data.resourceNames || [],
        hasYouTubeAccess: true,
        totalAccounts: data.resourceNames?.length || 0
      };
    } catch (error) {
      console.log("<=======>" ,process.env.GOOGLE_ADS_DEVELOPER_TOKEN );
      console.error('Error fetching Google ad accounts:', error);
      
      // Return successful response with empty accounts instead of error
      return { 
        adAccounts: [], 
        hasYouTubeAccess: true, 
        totalAccounts: 0,
        message: error.message.includes('failed:') ? "No ad accounts accessible" : error.message
      };
    }
  }

  async getFacebookAdAccounts(accessToken) {
    try {
      const [adAccountsResponse, igResponse] = await Promise.all([
        fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${accessToken}&fields=id,name,account_status`),
        fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}&fields=id,name,instagram_business_account`)
      ]);
      
      // Handle ad accounts response
      let adAccountsData = { data: [] };
      if (adAccountsResponse.ok) {
        adAccountsData = await adAccountsResponse.json();
      } else {
        const errorText = await adAccountsResponse.text();
        console.log("Ad accounts API error:", adAccountsResponse.status, errorText);
        
        // Handle specific cases where user has no ad accounts
        if (adAccountsResponse.status === 400 || adAccountsResponse.status === 403 || adAccountsResponse.status === 404) {
          console.log("User may not have any Facebook ad accounts or proper permissions");
        }
      }
      
      // Handle Instagram response
      let igData = { data: [] };
      if (igResponse.ok) {
        igData = await igResponse.json();
      } else {
        const errorText = await igResponse.text();
        console.log("Instagram accounts API error:", igResponse.status, errorText);
      }
      
      const instagramAccounts = igData.data?.filter(page => page.instagram_business_account) || [];
      
      return {
        adAccounts: adAccountsData.data || [],
        instagramAccounts,
        hasInstagramAccess: instagramAccounts.length > 0,
        totalAdAccounts: adAccountsData.data?.length || 0,
        totalInstagramAccounts: instagramAccounts.length,
        message: (adAccountsData.data?.length === 0 && instagramAccounts.length === 0) ? "No ad accounts or Instagram business accounts found" : undefined
      };
    } catch (error) {
      console.error('Error fetching Facebook ad accounts:', error);
      return { 
        adAccounts: [], 
        instagramAccounts: [], 
        hasInstagramAccess: false,
        totalAdAccounts: 0,
        totalInstagramAccounts: 0,
        message: error.message 
      };
    }
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  // Generate secure state parameter
  generateState(userId, authCase) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return Buffer.from(`${userId}:${authCase}:${timestamp}:${random}`).toString('base64');
  }

  // Verify state parameter
  verifyState(state, userId) {
    try {
      const decoded = Buffer.from(state.split(':')[1], 'base64').toString();
      const [stateUserId, , timestamp] = decoded.split(':');
      console.log("::: stateUserId:", stateUserId, "userId:", userId, "timestamp:", timestamp);
      // Check user ID match
      if (stateUserId != userId) {
        return false;
      }
      
      // Check timestamp (reject if older than 10 minutes)
      const stateTime = parseInt(timestamp);
      const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
      
      return stateTime > tenMinutesAgo;
    } catch {
      return false;
    }
  }

  // Check if error should not be retried
  isNonRetryableError(error) {
    const nonRetryableMessages = [
      'invalid_grant',
      'invalid_client', 
      'unauthorized_client',
      'invalid_refresh_token',
      'refresh_token_expired'
    ];
    
    return nonRetryableMessages.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }

  // Utility delay function
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===========================================
  // STORAGE METHODS (IMPLEMENT BASED ON YOUR DATABASE)
  // ===========================================

  // Store tokens securely
  async storeTokens(userId, platform, tokenData) {
    // Implement secure token storage
    // Example: database, encrypted storage, etc.
    console.log(`Storing tokens for user ${userId} on platform ${platform}`);
    
    // Add expiration timestamp if not present
    if (tokenData.expires_in && !tokenData.expires_at) {
      tokenData.expires_at = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
    }
    
    // Store last refresh time
    tokenData.last_refreshed = new Date().toISOString();
    
    // TODO: Implement actual storage logic
    /*
    await db.upsert('user_tokens', {
      user_id: userId,
      platform: platform,
      access_token: encrypt(tokenData.access_token),
      refresh_token: tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null,
      expires_at: tokenData.expires_at,
      last_refreshed: tokenData.last_refreshed,
      token_data: encrypt(JSON.stringify(tokenData))
    });
    */
  }

  // Get stored tokens
  async getStoredTokens(userId, platform) {
    // Implement token retrieval
    console.log(`Retrieving tokens for user ${userId} on platform ${platform}`);
    
    // TODO: Implement actual retrieval logic
    
    const tokenRecord = await AdsToken.findByUserAndPlatform(userId , platform);
    console.log("::: tokenRecord:", tokenRecord);
    if (!tokenRecord) return {};
    
    return {
      access_token: tokenRecord.access_token,
      refresh_token: tokenRecord.refresh_token ? tokenRecord.refresh_token : null,
      expires_at: tokenRecord.expires_at,
      last_refreshed: tokenRecord.last_refreshed
    };
    
    
    return {}; // Return empty object if no tokens found
  }

  // Mark user for re-authentication
  async markForReauth(userId, platform) {
    console.log(`Marking user ${userId} for re-authentication on ${platform}`);
    
    // TODO: Implement marking mechanism
    /*
    await db.update('user_tokens', 
      { user_id: userId, platform: platform },
      { needs_reauth: true, marked_at: new Date() }
    );
    
    // Optional: Send notification to user
    await notificationService.send(userId, {
      type: 'reauth_required',
      platform: platform,
      message: `Please re-authenticate your ${platform} account`
    });
    */
  }

  // Get all users that need token refresh
  async getUsersNeedingRefresh() {
    // TODO: Implement query to find users with expiring tokens
    /*
    const expiryThreshold = new Date(Date.now() + (this.refreshConfig.bufferMinutes * 60 * 1000));
    
    return await db.find('user_tokens', {
      expires_at: { $lt: expiryThreshold },
      refresh_token: { $ne: null },
      needs_reauth: { $ne: true }
    });
    */
    
    return []; // Return empty array for now
  }

  // Update user's auto-refresh preference
  async updateAutoRefreshSetting(userId, enabled, platforms = null) {
    console.log(`Setting auto-refresh for user ${userId}: ${enabled}`);
    
    // TODO: Store user preference for automatic token refresh
    /*
    await db.upsert('user_auth_settings', {
      user_id: userId,
      auto_refresh_enabled: enabled,
      enabled_platforms: platforms || Object.keys(this.platforms),
      updated_at: new Date()
    });
    */
  }

  // Get user's auto-refresh settings
  async getAutoRefreshSettings(userId) {
    // TODO: Return user's auto-refresh preferences
    /*
    const settings = await db.findOne('user_auth_settings', {
      user_id: userId
    });
    
    return settings || {
      enabled: true,
      platforms: Object.keys(this.platforms)
    };
    */
    
    return { 
      enabled: true, 
      platforms: Object.keys(this.platforms) 
    };
  }

  // ===========================================
  // AUTHENTICATION STATUS
  // ===========================================

  // Check if user is authenticated for specific case
  async isAuthenticated(userId, authCase) {
    const platforms = this.authCases[authCase];
    if (!platforms) {
      throw new Error(`Invalid authentication case: ${authCase}`);
    }

    const authStatus = {};

    for (const platform of platforms) {
      const tokens = await this.getStoredTokens(userId, platform);
      authStatus[platform] = {
        hasToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiresAt: tokens.expires_at,
        needsRefresh: tokens.access_token ? this.isTokenExpiringSoon(tokens) : false
      };
    }

    const isFullyAuthenticated = Object.values(authStatus).every(status => status.hasToken);
    const needsRefresh = Object.values(authStatus).some(status => status.needsRefresh);

    return {
      isFullyAuthenticated,
      needsRefresh,
      platformStatus: authStatus,
      authCase,
      requiredPlatforms: platforms
    };
  }

  // Get comprehensive user authentication status
  async getUserAuthStatus(userId) {
    const allPlatforms = Object.keys(this.platforms);
    const platformStatus = {};

    for (const platform of allPlatforms) {
      const tokens = await this.getStoredTokens(userId, platform);
      platformStatus[platform] = {
        isAuthenticated: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiresAt: tokens.expires_at,
        needsRefresh: tokens.access_token ? this.isTokenExpiringSoon(tokens) : false,
        lastRefreshed: tokens.last_refreshed
      };
    }

    return {
      userId,
      platformStatus,
      totalPlatforms: allPlatforms.length,
      authenticatedPlatforms: Object.values(platformStatus).filter(s => s.isAuthenticated).length,
      platformsNeedingRefresh: Object.values(platformStatus).filter(s => s.needsRefresh).length
    };
  }
}

module.exports = AdPlatformAuthenticator;