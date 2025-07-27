// Standalone Token Refresh Module
// Handles OAuth token refresh for Google, Facebook, Meta platforms

class TokenRefreshManager {
  constructor(config = {}) {
    // Platform configurations
    this.platforms = {
      google: {
        tokenUrl: 'https://oauth2.googleapis.com/token',
        requiredFields: ['client_id', 'client_secret', 'refresh_token'],
        grantType: 'refresh_token'
      },
      facebook: {
        tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
        requiredFields: ['client_id', 'client_secret', 'refresh_token'],
        grantType: 'refresh_token'
      },
      meta: {
        // Meta uses Facebook's token endpoint
        tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
        requiredFields: ['client_id', 'client_secret', 'refresh_token'],
        grantType: 'refresh_token'
      }
    };

    // Configuration options
    this.config = {
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000, // milliseconds
      timeoutMs: config.timeoutMs || 10000,
      bufferMinutes: config.bufferMinutes || 10, // Refresh 10 minutes before expiry
      ...config
    };
  }

  // ===========================================
  // MAIN REFRESH METHODS
  // ===========================================

  /**
   * Refresh access token using refresh token
   * @param {string} platform - Platform name (google, facebook, meta)
   * @param {Object} credentials - Token credentials
   * @param {string} credentials.client_id - OAuth client ID
   * @param {string} credentials.client_secret - OAuth client secret
   * @param {string} credentials.refresh_token - Refresh token
   * @returns {Promise<Object>} New token data
   */
  async refreshToken(platform, credentials) {
    if (!this.platforms[platform]) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    // Validate required credentials
    this.validateCredentials(platform, credentials);

    let lastError;
    
    // Retry logic
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        console.log(`Refreshing ${platform} token (attempt ${attempt}/${this.config.retryAttempts})`);
        
        const tokenData = await this.performTokenRefresh(platform, credentials);
        
        // Process and validate response
        const processedTokens = this.processTokenResponse(platform, tokenData, credentials);
        
        console.log(`Successfully refreshed ${platform} token`);
        return {
          success: true,
          platform,
          data: processedTokens,
          attempt
        };
        
      } catch (error) {
        lastError = error;
        console.error(`Token refresh attempt ${attempt} failed for ${platform}:`, error.message);
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          break;
        }
        
        // Wait before retry (except on last attempt)
        if (attempt < this.config.retryAttempts) {
          const delay = this.config.retryDelay * attempt; // Exponential backoff
          console.log(`Waiting ${delay}ms before retry...`);
          await this.delay(delay);
        }
      }
    }

    // All attempts failed
    return {
      success: false,
      platform,
      error: lastError.message,
      attempts: this.config.retryAttempts
    };
  }

  /**
   * Refresh multiple tokens in parallel
   * @param {Array} tokenRequests - Array of {platform, credentials} objects
   * @returns {Promise<Object>} Results for all refresh attempts
   */
  async refreshMultipleTokens(tokenRequests) {
    console.log(`Refreshing ${tokenRequests.length} tokens in parallel`);
    
    const refreshPromises = tokenRequests.map(async (request, index) => {
      try {
        const result = await this.refreshToken(request.platform, request.credentials);
        return { index, ...result };
      } catch (error) {
        return {
          index,
          success: false,
          platform: request.platform,
          error: error.message
        };
      }
    });

    const results = await Promise.allSettled(refreshPromises);
    
    // Process results
    const successful = [];
    const failed = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successful.push(result.value);
      } else {
        const errorInfo = result.status === 'fulfilled' 
          ? result.value 
          : { index, success: false, error: result.reason?.message || 'Unknown error' };
        failed.push(errorInfo);
      }
    });

    return {
      total: tokenRequests.length,
      successful: successful.length,
      failed: failed.length,
      results: {
        successful,
        failed
      }
    };
  }

  // ===========================================
  // TOKEN VALIDATION & CHECKING
  // ===========================================

  /**
   * Check if token needs refresh based on expiry time
   * @param {Object} tokenData - Token data with expiry information
   * @param {number} bufferMinutes - Minutes before expiry to refresh (optional)
   * @returns {boolean} True if token needs refresh
   */
  isTokenExpiringSoon(tokenData, bufferMinutes = null) {
    const buffer = bufferMinutes || this.config.bufferMinutes;
    
    // If no expiry info, assume it needs refresh
    if (!tokenData.expires_at && !tokenData.expires_in) {
      return true;
    }

    let expiryTime;
    
    if (tokenData.expires_at) {
      // ISO string or timestamp
      expiryTime = new Date(tokenData.expires_at);
    } else if (tokenData.expires_in) {
      // Seconds from now (or from issued_at if available)
      const issuedAt = tokenData.issued_at ? new Date(tokenData.issued_at) : new Date();
      expiryTime = new Date(issuedAt.getTime() + (tokenData.expires_in * 1000));
    }

    if (!expiryTime || isNaN(expiryTime.getTime())) {
      console.warn('Invalid expiry time format, assuming token needs refresh');
      return true;
    }

    const bufferTime = new Date(Date.now() + (buffer * 60 * 1000));
    const needsRefresh = expiryTime <= bufferTime;
    
    if (needsRefresh) {
      console.log(`Token expires at ${expiryTime.toISOString()}, within buffer time`);
    }
    
    return needsRefresh;
  }

  /**
   * Get fresh access token (refresh if needed)
   * @param {string} platform - Platform name
   * @param {Object} tokenData - Current token data
   * @param {Object} credentials - OAuth credentials
   * @returns {Promise<string>} Valid access token
   */
  async getFreshAccessToken(platform, tokenData, credentials) {
    if (!tokenData.access_token) {
      throw new Error('No access token available');
    }

    // Check if refresh is needed
    if (!this.isTokenExpiringSoon(tokenData)) {
      console.log(`${platform} token is still valid`);
      return {
        access_token: tokenData.access_token,
        needs_refresh: false,
        expires_at: tokenData.expires_at
      };
    }

    // Refresh token
    console.log(`${platform} token needs refresh`);
    const refreshResult = await this.refreshToken(platform, credentials);
    
    if (!refreshResult.success) {
      throw new Error(`Token refresh failed: ${refreshResult.error}`);
    }

    return {
      access_token: refreshResult.data.access_token,
      needs_refresh: true,
      refreshed_at: refreshResult.data.refreshed_at,
      expires_at: refreshResult.data.expires_at
    };
  }

  // ===========================================
  // INTERNAL HELPER METHODS
  // ===========================================

  /**
   * Perform the actual HTTP request to refresh token
   */
  async performTokenRefresh(platform, credentials) {
    const platformConfig = this.platforms[platform];
    
    // Prepare request parameters
    const params = {
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      refresh_token: credentials.refresh_token,
      grant_type: platformConfig.grantType
    };

    // Platform-specific parameter adjustments
    if (platform === 'facebook' || platform === 'meta') {
      // Facebook uses different parameter names
      params.fb_exchange_token = credentials.refresh_token;
    }

    // Make HTTP request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(platformConfig.tokenUrl, {
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
        let errorMessage;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error_description || errorData.error || errorText;
        } catch {
          errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
        }
        
        throw new Error(`Token refresh failed: ${errorMessage}`);
      }

      const tokenData = await response.json();
      
      if (tokenData.error) {
        throw new Error(tokenData.error_description || tokenData.error);
      }

      return tokenData;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Token refresh timed out after ${this.config.timeoutMs}ms`);
      }
      
      throw error;
    }
  }

  /**
   * Process and standardize token response
   */
  processTokenResponse(platform, tokenData, originalCredentials) {
    const now = new Date();
    
    // Preserve refresh token if not returned (Facebook often doesn't return new one)
    if (!tokenData.refresh_token && originalCredentials.refresh_token) {
      tokenData.refresh_token = originalCredentials.refresh_token;
    }

    // Add metadata
    const processedData = {
      ...tokenData,
      platform,
      refreshed_at: now.toISOString(),
      issued_at: now.toISOString()
    };

    // Calculate expiry timestamp
    if (tokenData.expires_in && !tokenData.expires_at) {
      const expiryDate = new Date(now.getTime() + (tokenData.expires_in * 1000));
      processedData.expires_at = expiryDate.toISOString();
    }

    // Validate required fields in response
    if (!processedData.access_token) {
      throw new Error('Response missing access_token');
    }

    return processedData;
  }

  /**
   * Validate credentials for platform
   */
  validateCredentials(platform, credentials) {
    const requiredFields = this.platforms[platform].requiredFields;
    
    for (const field of requiredFields) {
      if (!credentials[field]) {
        throw new Error(`Missing required credential: ${field}`);
      }
    }
  }

  /**
   * Check if error should not be retried
   */
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

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  /**
   * Create credentials object from environment variables or config
   */
  static createCredentials(platform, config = {}) {
    const envPrefix = platform.toUpperCase();
    
    return {
      client_id: config.client_id || process.env[`${envPrefix}_CLIENT_ID`],
      client_secret: config.client_secret || process.env[`${envPrefix}_CLIENT_SECRET`],
      refresh_token: config.refresh_token // This must be provided
    };
  }

  /**
   * Batch refresh tokens with error handling
   */
  async batchRefresh(tokenMap) {
    const requests = Object.entries(tokenMap).map(([userId, userTokens]) => 
      Object.entries(userTokens).map(([platform, tokenData]) => ({
        userId,
        platform,
        credentials: {
          ...TokenRefreshManager.createCredentials(platform),
          refresh_token: tokenData.refresh_token
        },
        currentTokenData: tokenData
      }))
    ).flat();

    console.log(`Starting batch refresh for ${requests.length} tokens`);
    
    const results = await this.refreshMultipleTokens(requests);
    
    // Organize results by user and platform
    const organizedResults = {};
    
    [...results.results.successful, ...results.results.failed].forEach(result => {
      const request = requests[result.index];
      if (!organizedResults[request.userId]) {
        organizedResults[request.userId] = {};
      }
      organizedResults[request.userId][request.platform] = result;
    });

    return {
      summary: {
        total: results.total,
        successful: results.successful,
        failed: results.failed
      },
      results: organizedResults
    };
  }
}

// ===========================================
// USAGE EXAMPLES
// ===========================================

/*
// Basic usage - single token refresh
const refreshManager = new TokenRefreshManager({
  retryAttempts: 3,
  retryDelay: 2000,
  bufferMinutes: 15
});

// Refresh Google token
const googleResult = await refreshManager.refreshToken('google', {
  client_id: 'your_google_client_id',
  client_secret: 'your_google_client_secret',
  refresh_token: 'your_refresh_token'
});

if (googleResult.success) {
  console.log('New access token:', googleResult.data.access_token);
  console.log('Expires at:', googleResult.data.expires_at);
}

// Check if token needs refresh
const needsRefresh = refreshManager.isTokenExpiringSoon({
  expires_at: '2024-07-28T10:00:00.000Z'
});

// Get fresh token (auto-refresh if needed)
const freshToken = await refreshManager.getFreshAccessToken('google', currentTokenData, credentials);

// Refresh multiple tokens
const multipleResults = await refreshManager.refreshMultipleTokens([
  {
    platform: 'google',
    credentials: { client_id: '...', client_secret: '...', refresh_token: '...' }
  },
  {
    platform: 'facebook',
    credentials: { client_id: '...', client_secret: '...', refresh_token: '...' }
  }
]);

// Batch refresh for multiple users
const batchResults = await refreshManager.batchRefresh({
  'user1': {
    'google': { refresh_token: '...', expires_at: '...' },
    'facebook': { refresh_token: '...', expires_at: '...' }
  },
  'user2': {
    'google': { refresh_token: '...', expires_at: '...' }
  }
});
*/

module.exports = TokenRefreshManager;