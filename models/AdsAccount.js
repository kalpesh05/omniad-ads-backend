const { pool } = require('../config/database');

class AdsAccount {
  constructor(data) {
    this.id = data.id;
    this.token_id = data.token_id;
    this.account_id = data.account_id;
    this.account_name = data.account_name;
    this.currency = data.currency;
    this.status = data.status;
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create new ads account
  static async create({ token_id, account_id, account_name, currency, status, is_active = true }) {
    const [result] = await pool.execute(
      `INSERT INTO ads_accounts (token_id, account_id, account_name, currency, status, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [token_id, account_id, account_name, currency, status, is_active]
    );

    return await AdsAccount.findById(result.insertId);
  }

  // Find account by ID
  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT * FROM ads_accounts WHERE id = ? AND is_active = true`,
      [id]
    );
    return rows.length > 0 ? new AdsAccount(rows[0]) : null;
  }

  // Find accounts by token_id
  static async findByTokenId(token_id) {
    const [rows] = await pool.execute(
      `SELECT * FROM ads_accounts WHERE token_id = ? AND is_active = true`,
      [token_id]
    );
    return rows.map(row => new AdsAccount(row));
  }

  // Find accounts by user and platform via join
  static async findByUserAndPlatform(user_id, platform) {
    const [rows] = await pool.execute(
      `SELECT a.* 
       FROM ads_accounts a
       JOIN ads_tokens t ON a.token_id = t.id
       WHERE t.user_id = ? AND t.platform = ? AND a.is_active = true`,
      [user_id, platform]
    );
    return rows.map(row => new AdsAccount(row));
  }

  // Update account
  async update(updateData) {
    const allowedFields = ['account_name', 'currency', 'status', 'is_active'];
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
  }

  // Soft delete account
  async delete() {
    await pool.execute(
      `UPDATE ads_accounts SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [this.id]
    );
    return true;
  }

  toJSON() {
    return {
      id: this.id,
      token_id: this.token_id,
      account_id: this.account_id,
      account_name: this.account_name,
      currency: this.currency,
      status: this.status,
      is_active: this.is_active,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = AdsAccount;
