const cron = require('node-cron');
const AdPlatformAuthenticator = require('../utils/adsPlatformAuthenticator');

/**
 * Initializes the background cron job for auto-refreshing OAuth tokens.
 */
function initTokenRefreshCron() {
    console.log('[Cron] Initializing background OAuth token refresher jobs...');

    // Run every 10 minutes to check if any tokens are expiring soon
    cron.schedule('*/10 * * * *', async () => {
        try {
            console.log('[TokenRefresher] Scanning for expiring OAuth tokens...');
            const authService = new AdPlatformAuthenticator();

            const usersNeedingRefresh = await authService.getUsersNeedingRefresh();

            if (!usersNeedingRefresh || usersNeedingRefresh.length === 0) {
                return;
            }

            console.log(`[TokenRefresher] Found ${usersNeedingRefresh.length} token(s) requiring refresh.`);

            for (const record of usersNeedingRefresh) {
                try {
                    await authService.refreshToken(record.user_id, record.platform);
                    console.log(`[TokenRefresher] Successfully auto-refreshed ${record.platform} token for user ${record.user_id}`);
                } catch (refreshErr) {
                    console.error(`[TokenRefresher] Failed to auto-refresh ${record.platform} for ${record.user_id}:`, refreshErr.message);
                }
            }
        } catch (error) {
            console.error('[TokenRefresher] Fatal error during token refresh cycle:', error);
        }
    });
}

module.exports = { initTokenRefreshCron };
