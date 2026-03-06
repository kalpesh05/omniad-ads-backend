const cron = require('node-cron');
const { pool } = require('../config/database');
const DataSyncService = require('../services/dataSyncService');
const AdPlatformAuthenticator = require('../utils/adsPlatformAuthenticator');

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

const initDataSyncCron = () => {
    // Run every 3 hours natively in Node
    cron.schedule('0 */3 * * *', syncAllActiveAccounts);
    console.log('🕒 Data Sync engine scheduled (Every 3 hours)');
};

module.exports = { initDataSyncCron, syncAllActiveAccounts };
