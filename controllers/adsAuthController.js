const AdPlatformAuthenticator = require('../utils/adsPlatformAuthenticator'); // Adjust as needed
const {
    successResponse,
    errorResponse,
    unauthorizedResponse,
    conflictResponse,
    notFoundResponse
} = require('../utils/response');
const AdsToken = require('../models/AdsToken'); // Adjust the path as needed
const Adsservice = require('../services/authService'); // Adjust the path as needed

const authenticator = new AdPlatformAuthenticator();

class AdsAuthController {
    // Generate authentication URLs for a specific auth case (e.g., SOCIAL_MEDIA_SUITE)
    static async generateAuthUrls(req, res) {
        try {
            const userId = req.user.id;
            const authCase = req.params.authCase;

            const urls = authenticator.generateAuthUrl(authCase, userId);

            successResponse(res, { authCase, urls }, 'Authentication URLs generated successfully');
        } catch (error) {
            console.error('Generate Auth URLs Error:', error);
            errorResponse(res, 'Failed to generate authentication URLs');
        }
    }

    // Generate authentication URL for a single platform
    static async generatePlatformAuthUrl(req, res) {
        try {
            const userId = req.user.id;
            const platform = req.params.platform;

            const url = authenticator.generateSinglePlatformAuthUrl(platform, userId);

            successResponse(res, { platform, url }, 'Platform authentication URL generated successfully');
        } catch (error) {
            console.error('Generate Platform Auth URL Error:', error);
            errorResponse(res, 'Failed to generate platform authentication URL');
        }
    }

    // Handle OAuth callback
    static async handleOAuthCallback(req, res) {
        try {
            const { code, state } = req.query;
            const platform = req.params.platform;
            const userId = req.user.id;

            const tokenData = await authenticator.handleCallback(platform, code, state, userId);

            // Destructure relevant fields
            const {
                access_token,
                refresh_token,
                expiry_date,
                token_type,
                scope
            } = tokenData?.tokenData || {};
            if (!access_token) {
                return errorResponse(res, 'Access token not received from OAuth callback');
            }
           
            // Save or update token in DB
            const savedToken = await AdsToken.fetchTokens(userId, platform);

            successResponse(res, savedToken.toJSON(), `${platform} account authenticated successfully`);
        } catch (error) {
            console.error('OAuth Callback Error:', error);
            errorResponse(res, 'Failed to handle OAuth callback');
        }
    }

    // Check if user is authenticated for a given auth case
    static async checkAuthStatus(req, res) {
        try {
            const userId = req.user.id;
            const authCase = req.params.authCase;

            const status = await authenticator.isAuthenticated(userId, authCase);

            successResponse(res, status, `Authentication status for ${authCase} retrieved`);
        } catch (error) {
            console.error('Check Auth Status Error:', error);
            errorResponse(res, 'Failed to check authentication status');
        }
    }

    // Get full authentication status across all platforms
    static async getFullAuthStatus(req, res) {
        try {
            const userId = req.user.id;

            const status = await authenticator.getUserAuthStatus(userId);

            successResponse(res, status, 'Full authentication status retrieved');
        } catch (error) {
            console.error('Get Full Auth Status Error:', error);
            errorResponse(res, 'Failed to retrieve authentication status');
        }
    }

    // Refresh tokens for one or more platforms
    static async refreshTokens(req, res) {
        try {
            const userId = req.user.id;
            const platforms = req.body.platforms || null; // Optional: specific platforms

            const result = await authenticator.refreshAllUserTokens(userId, platforms);

            successResponse(res, result, 'Tokens refreshed successfully');
        } catch (error) {
            console.error('Refresh Tokens Error:', error);
            errorResponse(res, 'Failed to refresh tokens');
        }
    }

    // endpoint to check if user has accounts for a platform
    static async checkUserHasAccounts(req, res) {
        try {
            const userId = req.user.id;
            const platform = req.params.platform;

            const hasAccounts = await authenticator.userHasAccounts(userId, platform);

            successResponse(res, { hasAccounts }, `User has accounts for ${platform}`);
        } catch (error) {
            console.error('Check User Accounts Error:', error);
            errorResponse(res, 'Failed to check user accounts');
        }
    }
}

module.exports = AdsAuthController;
