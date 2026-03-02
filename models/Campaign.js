const { pool } = require('../config/database');

class Campaign {
    constructor(campaignData) {
        this.id = campaignData.id;
        this.account_id = campaignData.account_id;
        this.campaign_id = campaignData.campaign_id;
        this.campaign_name = campaignData.campaign_name;
        this.status = campaignData.status;
        this.objective = campaignData.objective;
        this.budget = campaignData.budget;
        this.start_date = campaignData.start_date;
        this.end_date = campaignData.end_date;
        this.created_at = campaignData.created_at;
        this.updated_at = campaignData.updated_at;
        // joined fields
        this.platform = campaignData.platform;
    }

    // Find all campaigns for a user across all connected accounts
    static async findAllByUser(userId) {
        try {
            const [rows] = await pool.execute(`
        SELECT 
            c.*, 
            ca.platform
        FROM ads_campaigns c
        JOIN connected_accounts ca ON c.account_id = ca.id
        JOIN ads_tokens at ON ca.token_id = at.id
        WHERE at.user_id = ?
        ORDER BY c.created_at DESC
      `, [userId]);

            return rows.map(row => new Campaign(row));
        } catch (error) {
            console.error('Error finding campaigns by user:', error);
            throw error;
        }
    }

}

module.exports = Campaign;
