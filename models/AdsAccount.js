const { pool } = require('../config/database');

class AdsAccount {
  constructor(accountData) {
    this.id = accountData.id;
    this.user_id = accountData.user_id;
    this.platform = accountData.platform; // 'facebook' or 'google'
    this.account_id = accountData.account_id;
    this.account_name = accountData.account_name;
    this.access_token = accountData.access_token;
    this.refresh_token = accountData.refresh_token;
    this.token_expires_at = accountData.token_expires_at;
    this.is_active = accountData.is_active !== undefined ? accountData.is_active : true;
    this.created_at = accountData.created_at;
    this.updated_at = accountData.updated_at;
  }

  // Create new ads account
  static async create(accountData) {
    try {
      const [result] = await pool.execute(
        'INSERT INTO ads_accounts (user_id, platform, account_id, account_name, access_token, refresh_token, token_expires_at, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          accountData.user_id,
          accountData.platform,
          accountData.account_id,
          accountData.account_name,
          accountData.access_token,
          accountData.refresh_token,
          accountData.token_expires_at,
          accountData.is_active !== undefined ? accountData.is_active : true
        ]
      );

      return await AdsAccount.findById(result.insertId);
    } catch (error) {
      throw error;
    }
  }

  // Find account by ID
  static async findById(id) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM ads_accounts WHERE id = ? AND is_active = true',
        [id]
      );
      
      return rows.length > 0 ? new AdsAccount(rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  // Find accounts by user and platform
  static async findByUserAndPlatform(userId, platform) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM ads_accounts WHERE user_id = ? AND platform = ? AND is_active = true',
        [userId, platform]
      );
      
      return rows.map(row => new AdsAccount(row));
    } catch (error) {
      throw error;
    }
  }

  // Find all accounts for user
  static async findByUser(userId) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM ads_accounts WHERE user_id = ? AND is_active = true ORDER BY platform, account_name',
        [userId]
      );
      
      return rows.map(row => new AdsAccount(row));
    } catch (error) {
      throw error;
    }
  }

  // Update account
  async update(updateData) {
    try {
      const allowedFields = ['account_name', 'access_token', 'refresh_token', 'token_expires_at', 'is_active'];
      const updates = [];
      const values = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updates.push(`${key} = ?`);
          values.push(value);
        }
      }

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(this.id);
      
      await pool.execute(
        `UPDATE ads_accounts SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );

      return await AdsAccount.findById(this.id);
    } catch (error) {
      throw error;
    }
  }

  // Soft delete account
  async delete() {
    try {
      await pool.execute(
        'UPDATE ads_accounts SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [this.id]
      );
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Get without sensitive data
  toJSON() {
    const { access_token, refresh_token, ...accountWithoutTokens } = this;
    return accountWithoutTokens;
  }
}

module.exports = AdsAccount;