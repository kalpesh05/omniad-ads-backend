const cron = require('node-cron');
const ContentPublisher = require('../services/contentPublisher');

/**
 * Initializes the background cron jobs for the OmniAds backend.
 */
function initCronJobs() {
    console.log('[Cron] Initializing background publisher jobs...');

    // Run every minute (checks for posts whose scheduled_for time has passed)
    cron.schedule('* * * * *', async () => {
        await ContentPublisher.syncScheduledPosts();
    });
}

module.exports = { initCronJobs };
