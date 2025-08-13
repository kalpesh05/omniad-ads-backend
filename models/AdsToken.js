const { pool } = require('../config/database');

class AdsToken {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.platform = data.platform;
    this.access_token = data.access_token;
    this.refresh_token = data.refresh_token;
    this.expiry_date = data.expiry_date;
    this.token_type = data.token_type;
    this.scope = data.scope;
    this.last_refreshed = data.last_refreshed;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create or update token for user & platform
  static async upsert({
    user_id,
    platform,
    access_token,
    refresh_token,
    expiry_date,
    token_type,
    scope,
    last_refreshed = new Date()
  }) {
    const [result] = await pool.execute(`
      INSERT INTO ads_tokens (
        user_id, platform, access_token, refresh_token, expiry_date, token_type, scope, last_refreshed
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        access_token = VALUES(access_token),
        refresh_token = VALUES(refresh_token),
        expiry_date = VALUES(expiry_date),
        token_type = VALUES(token_type),
        scope = VALUES(scope),
        last_refreshed = VALUES(last_refreshed),
        updated_at = CURRENT_TIMESTAMP
    `, [
      user_id,
      platform,
      access_token,
      refresh_token,
      expiry_date,
      token_type,
      scope,
      last_refreshed
    ]);

    return await AdsToken.findByUserAndPlatform(user_id, platform);
  }

  // Find token by user and platform
  static async findByUserAndPlatform(user_id, platform) {
    const [rows] = await pool.execute(
      'SELECT * FROM ads_tokens WHERE user_id = ? AND platform = ?',
      [user_id, platform]
    );
    return rows.length > 0 ? new AdsToken(rows[0]) : null;
  }

  // Delete token by user and platform
  static async deleteByUserAndPlatform(user_id, platform) {
    await pool.execute(
      'DELETE FROM ads_tokens WHERE user_id = ? AND platform = ?',
      [user_id, platform]
    );
  }

  // Delete all tokens for a user
  static async deleteByUserId(user_id) {
    await pool.execute(
      'DELETE FROM ads_tokens WHERE user_id = ?',
      [user_id]
    );
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      platform: this.platform,
      access_token: this.access_token,
      refresh_token: this.refresh_token,
      expiry_date: this.expiry_date,
      token_type: this.token_type,
      scope: this.scope,
      last_refreshed: this.last_refreshed,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = AdsToken;
