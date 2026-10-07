const cron = require('node-cron');
const { pool } = require('../config/database');
const DataSyncService = require('../services/dataSyncService');
const AdPlatformAuthenticator = require('../utils/adsPlatformAuthenticator');
const FatigueAlertService = require('../services/fatigueAlertService');
const SocialSyncService = require('../services/socialSyncService');
const prisma = require('../config/prisma');

const authenticator = new AdPlatformAuthenticator();

const syncAllActiveAccounts = async () => {
    console.log('🔄 Starting multi-platform data sync engine...');
    try {
        // Query all active connected accounts that have sync enabled
        const [accounts] = await pool.execute(`
            SELECT ca.id as db_account_id, ca.account_id as api_account_id, ca.platform, at.user_id, ca.sync_enabled
            FROM connected_accounts ca
            JOIN ads_tokens at ON ca.token_id = at.id
            WHERE ca.is_active = true AND ca.sync_enabled = true
        `);

        console.log(`Found ${accounts.length} active connection(s) to synchronize.`);

        for (const account of accounts) {
            try {
                // Ensure the OAuth token is valid and refreshed if necessary
                const validAccessToken = await authenticator.getValidAccessToken(account.user_id, account.platform);

                if (validAccessToken) {
                    await DataSyncService.syncPlatformData(
                        account.platform,
                        validAccessToken,
                        account.api_account_id,
                        account.db_account_id
                    );

                    // Update last sync time
                    await pool.execute('UPDATE connected_accounts SET last_sync_at = NOW() WHERE id = ?', [account.db_account_id]);
                } else {
                    console.log(`⚠️ Skipped ${account.platform} account ${account.api_account_id} - Unable to secure valid token.`);
                }
            } catch (err) {
                console.error(`Failed to sync account ${account.db_account_id}:`, err.message);
            }
        }

        console.log('✅ Multi-platform data sync completed');
    } catch (error) {
        console.error('❌ Sync engine failed:', error);
    }
};

const autoScanCreativeFatigue = async () => {
    console.log('🔍 [Cron] Running automated creative fatigue scan & alert dispatch...');
    try {
        const teams = await prisma.teams.findMany({ select: { id: true } });
        for (const team of teams) {
            // Also ensure initial benchmark organic media is active
            await SocialSyncService.ensureInitialPosts(team.id);

            const results = await FatigueAlertService.scanAndDispatch(team.id);
            if (results && results.fatiguedCount > 0) {
                console.log(`[Cron] Team ${team.id}: ${results.fatiguedCount} fatigued assets detected. Dispatched ${results.dispatched.slack} Slack alert(s).`);
            }
        }
        console.log('✅ [Cron] Automated creative fatigue scan finished');
    } catch (err) {
        console.error('❌ [Cron] Creative fatigue scan failed:', err.message);
    }
};

const initDataSyncCron = () => {
    // Run platform sync every 3 hours natively in Node
    cron.schedule('0 */3 * * *', syncAllActiveAccounts);

    // Run automated creative fatigue scan every 6 hours
    cron.schedule('0 */6 * * *', autoScanCreativeFatigue);

    console.log('🕒 Data Sync engine & Creative Fatigue Cron scheduled');
};

module.exports = { initDataSyncCron, syncAllActiveAccounts, autoScanCreativeFatigue };
