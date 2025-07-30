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
