// ============================================================================
// src/controllers/adAuthController.js - Ad Platform Authentication Controller (Functional)
// ============================================================================

const AdPlatformAuthenticator = require('../utils/AdPlatformAuthenticator');
const database = require('../config/database');
const { sendResponse, sendError } = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');

// Initialize authenticator instance
const authenticator = new AdPlatformAuthenticator();

// Generate authentication URLs for specific case
const generateAuthUrls = async (req, res) => {
  try {
    const { authCase, customState } = req.body;
    const userId = req.user.id.toString();

    // Validate auth case
    if (!authenticator.authCases[authCase]) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, `Invalid authentication case: ${authCase}`);
    }

    const authUrls = authenticator.generateAuthUrl(authCase, userId, customState);

    // Log auth attempt
    console.log(`🔗 Generated auth URLs for user ${userId}, case: ${authCase}`);

    sendResponse(res, HTTP_STATUS.OK, 'Authentication URLs generated successfully', {
      authCase,
      authUrls,
      requiredPlatforms: authenticator.authCases[authCase],
      instructions: 'Visit each URL to complete platform authentication'
    });

  } catch (error) {
    console.error('❌ Auth URL generation error:', error);
    sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to generate authentication URLs');
  }
};

// Generate single platform auth URL
const generateSinglePlatformAuth = async (req, res) => {
  try {
    const { platform } = req.params;
    const { customScopes } = req.body;
    const userId = req.user.id.toString();

    if (!authenticator.platforms[platform]) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, `Unsupported platform: ${platform}`);
    }

    const authUrl = authenticator.generateSinglePlatformAuthUrl(
      platform, 
      userId, 
      customScopes
    );

    sendResponse(res, HTTP_STATUS.OK, `${platform} authentication URL generated`, {
      platform,
      authUrl,
      scopes: customScopes || authenticator.platforms[platform].scopes
    });

  } catch (error) {
    console.error('❌ Single platform auth error:', error);
    sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to generate authentication URL');
  }
};

// Handle OAuth callback
const handleOAuthCallback = async (req, res) => {
  try {
    const { platform } = req.params;
    const { code, state, error } = req.query;
    const userId = req.user.id.toString();

    // Handle OAuth errors
    if (error) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, `OAuth error: ${error}`);
    }

    if (!code) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Authorization code not provided');
    }

    if (!state) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'State parameter missing');
    }

    // Process the callback
    const result = await authenticator.handleCallback(platform, code, state, userId);

    // Update user's ad platform connections in database
    await updateUserAdPlatforms(userId, platform, result);

    console.log(`✅ Successfully authenticated ${userId} for ${platform}`);

    sendResponse(res, HTTP_STATUS.OK, `${platform} authentication successful`, {
      platform: result.platform,
      userInfo: result.userInfo,
      permissions: result.permissions,
      tokenInfo: result.tokenData
    });

  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    sendError(res, HTTP_STATUS.BAD_REQUEST, error.message || 'OAuth callback failed');
  }
};

// Get user's authentication status
const getAuthStatus = async (req, res) => {
  try {
    const { authCase } = req.query;
    const userId = req.user.id.toString();

    let authStatus;

    if (authCase) {
      // Get status for specific auth case
      authStatus = await authenticator.isAuthenticated(userId, authCase);
    } else {
      // Get comprehensive auth status
      authStatus = await authenticator.getUserAuthStatus(userId);
    }

    sendResponse(res, HTTP_STATUS.OK, 'Authentication status retrieved', authStatus);

  } catch (error) {
    console.error('❌ Auth status error:', error);
    sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to get authentication status');
  }
};

// Refresh tokens for user
const refreshUserTokens = async (req, res) => {
  try {
    const { platforms } = req.body;
    const userId = req.user.id.toString();

    const results = await authenticator.refreshAllUserTokens(userId, platforms);

    const successCount = Object.keys(results.results).length;
    const errorCount = Object.keys(results.errors).length;

    const message = `Token refresh completed: ${successCount} successful, ${errorCount} failed`;

    sendResponse(res, HTTP_STATUS.OK, message, {
      results: results.results,
      errors: results.errors,
      summary: {
        successful: successCount,
        failed: errorCount,
        platforms: platforms || Object.keys(authenticator.platforms)
      }
    });

  } catch (error) {
    console.error('❌ Token refresh error:', error);
    sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Token refresh failed');
  }
};

// Get valid access token for platform
const getAccessToken = async (req, res) => {
  try {
    const { platform } = req.params;
    const userId = req.user.id.toString();

    if (!authenticator.platforms[platform]) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, `Unsupported platform: ${platform}`);
    }

    const accessToken = await authenticator.getValidAccessToken(userId, platform);

    sendResponse(res, HTTP_STATUS.OK, 'Access token retrieved', {
      platform,
      hasToken: !!accessToken,
      tokenPreview: accessToken ? `${accessToken.substring(0, 10)}...` : null
    });

  } catch (error) {
    console.error('❌ Access token error:', error);
    sendError(res, HTTP_STATUS.UNAUTHORIZED, error.message || 'Failed to get access token');
  }
};

// Disconnect platform
const disconnectPlatform = async (req, res) => {
  try {
    const { platform } = req.params;
    const userId = req.user.id.toString();

    // Remove tokens from storage
    await authenticator.removeTokens(userId, platform);

    // Update user record
    await removeUserAdPlatform(userId, platform);

    console.log(`🔌 Disconnected ${platform} for user ${userId}`);

    sendResponse(res, HTTP_STATUS.OK, `${platform} disconnected successfully`, {
      platform,
      disconnectedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Platform disconnect error:', error);
    sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to disconnect platform');
  }
};

// Get user's ad accounts and permissions
const getUserAdAccounts = async (req, res) => {
  try {
    const { platform } = req.params;
    const userId = req.user.id.toString();

    const accessToken = await authenticator.getValidAccessToken(userId, platform);
    const permissions = await authenticator.getPermissions(platform, accessToken);

    sendResponse(res, HTTP_STATUS.OK, `${platform} ad accounts retrieved`, {
      platform,
      permissions,
      retrievedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Ad accounts error:', error);
    sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to get ad accounts');
  }
};

// Get available auth cases
const getAuthCases = (req, res) => {
  try {
    const authCases = Object.keys(authenticator.authCases).map(caseKey => ({
      case: caseKey,
      platforms: authenticator.authCases[caseKey],
      description: getAuthCaseDescription(caseKey)
    }));

    sendResponse(res, HTTP_STATUS.OK, 'Available authentication cases', {
      authCases,
      supportedPlatforms: Object.keys(authenticator.platforms)
    });

  } catch (error) {
    console.error('❌ Auth cases error:', error);
    sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to get auth cases');
  }
};

// Update auto-refresh settings
const updateAutoRefresh = async (req, res) => {
  try {
    const { enabled, platforms } = req.body;
    const userId = req.user.id.toString();

    await authenticator.updateAutoRefreshSetting(userId, enabled, platforms);

    sendResponse(res, HTTP_STATUS.OK, 'Auto-refresh settings updated', {
      enabled,
      platforms: platforms || Object.keys(authenticator.platforms),
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Auto-refresh update error:', error);
    sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update auto-refresh settings');
  }
};

// Admin function to get users needing refresh
const getUsersNeedingRefresh = async (req, res) => {
  try {
    const users = await authenticator.getUsersNeedingRefresh();
    sendResponse(res, HTTP_STATUS.OK, 'Users needing refresh retrieved', {
      users
    });
  } catch (error) {
    console.error('❌ Users needing refresh error:', error);
    sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to get users needing refresh');
  }
};

// Helper functions (moved outside of class structure)
const updateUserAdPlatforms = async (userId, platform, authResult) => {
  try {
    const user = database.findUserById(parseInt(userId));
    if (!user) return;

    if (!user.adPlatforms) {
      user.adPlatforms = {};
    }

    user.adPlatforms[platform] = {
      connected: true,
      connectedAt: new Date().toISOString(),
      userInfo: authResult.userInfo,
      permissions: authResult.permissions,
      lastRefresh: new Date().toISOString()
    };

    database.updateUser(parseInt(userId), { adPlatforms: user.adPlatforms });
  } catch (error) {
    console.error('Error updating user ad platforms:', error);
  }
};

const removeUserAdPlatform = async (userId, platform) => {
  try {
    const user = database.findUserById(parseInt(userId));
    if (!user || !user.adPlatforms) return;

    if (user.adPlatforms[platform]) {
      user.adPlatforms[platform].connected = false;
      user.adPlatforms[platform].disconnectedAt = new Date().toISOString();
    }

    database.updateUser(parseInt(userId), { adPlatforms: user.adPlatforms });
  } catch (error) {
    console.error('Error removing user ad platform:', error);
  }
};

const getAuthCaseDescription = (caseKey) => {
  const descriptions = {
    GOOGLE_ADS_ONLY: 'Google Ads platform only',
    FACEBOOK_ADS_ONLY: 'Facebook Ads platform only',
    INSTAGRAM_ADS_ONLY: 'Instagram Ads platform only',
    YOUTUBE_ADS_ONLY: 'YouTube Ads via Google platform',
    SOCIAL_MEDIA_SUITE: 'Facebook, Instagram, and Google platforms',
    ALL_PLATFORMS: 'All supported advertising platforms',
    GOOGLE_ECOSYSTEM: 'Google Ads and YouTube',
    META_ECOSYSTEM: 'Facebook and Instagram platforms',
    SEARCH_ONLY: 'Google search advertising',
    SOCIAL_ONLY: 'Social media advertising (Facebook + Instagram)',
    CROSS_PLATFORM: 'Cross-platform advertising suite'
  };
  return descriptions[caseKey] || 'Custom authentication case';
};

module.exports = {
  generateAuthUrls,
  generateSinglePlatformAuth,
  handleOAuthCallback,
  getAuthStatus,
  refreshUserTokens,
  getAccessToken,
  disconnectPlatform,
  getUserAdAccounts,
  getAuthCases,
  updateAutoRefresh,
  getUsersNeedingRefresh
};

// ============================================================================
// Updated src/routes/adAuthRoutes.js - Routes for Functional Controller
// ============================================================================

/*
const express = require('express');
const {
  generateAuthUrls,
  generateSinglePlatformAuth,
  handleOAuthCallback,
  getAuthStatus,
  refreshUserTokens,
  getAccessToken,
  disconnectPlatform,
  getUserAdAccounts,
  getAuthCases,
  updateAutoRefresh,
  getUsersNeedingRefresh
} = require('../controllers/adAuthController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { adAuthValidation, handleValidationErrors } = require('../middleware/validation');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// Authentication URL generation
router.post('/generate-auth-urls', 
  authenticateToken, 
  adAuthValidation.generateAuthUrls, 
  handleValidationErrors,
  generateAuthUrls
);

router.post('/generate-auth/:platform', 
  authenticateToken,
  adAuthValidation.singlePlatformAuth,
  handleValidationErrors,
  generateSinglePlatformAuth
);

// OAuth callbacks
router.get('/callback/:platform', 
  authenticateToken,
  handleOAuthCallback
);

// Authentication status
router.get('/status', 
  authenticateToken, 
  getAuthStatus
);

// Token management
router.post('/refresh-tokens', 
  authenticateToken,
  adAuthValidation.refreshTokens,
  handleValidationErrors,
  refreshUserTokens
);

router.get('/access-token/:platform', 
  authenticateToken,
  getAccessToken
);

// Platform management
router.delete('/disconnect/:platform', 
  authenticateToken,
  disconnectPlatform
);

router.get('/ad-accounts/:platform', 
  authenticateToken,
  getUserAdAccounts
);

// Configuration
router.get('/auth-cases', 
  authenticateToken,
  getAuthCases
);

router.put('/auto-refresh', 
  authenticateToken,
  adAuthValidation.autoRefresh,
  handleValidationErrors,
  updateAutoRefresh
);

// Admin routes for monitoring
router.get('/admin/users-needing-refresh', 
  authenticateToken,
  authorizeRoles(ROLES.ADMIN),
  getUsersNeedingRefresh
);

module.exports = router;
*/