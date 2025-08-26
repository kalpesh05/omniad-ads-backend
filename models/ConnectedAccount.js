const { pool } = require('../config/database');

class ConnectedAccount {
  constructor(data) {
    this.id = data.id;
    this.token_id = data.token_id;
    this.account_id = data.account_id;
    this.account_name = data.account_name;
    this.platform = data.platform;
    this.account_type = data.account_type;
    this.permissions = data.permissions;
    this.account_owner_name = data.account_owner_name;
    this.account_owner_email = data.account_owner_email;
    this.timezone = data.timezone;
    this.country_code = data.country_code;
    this.currency = data.currency;
    this.billing_currency = data.billing_currency;
    this.status = data.status;
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.sync_enabled = data.sync_enabled !== undefined ? data.sync_enabled : true;
    this.last_sync_at = data.last_sync_at;
    this.sync_frequency = data.sync_frequency;
    this.metadata = data.metadata;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create new connected account
  static async create({ 
    token_id, account_id, account_name, platform, account_type = 'business',
    permissions, account_owner_name, account_owner_email, timezone = 'UTC',
    country_code, currency, billing_currency, status, is_active = true,
    sync_enabled = true, sync_frequency = 'daily', metadata
  }) {
    const [result] = await pool.execute(
      `INSERT INTO connected_accounts (
        token_id, account_id, account_name, platform, account_type,
        permissions, account_owner_name, account_owner_email, timezone,
        country_code, currency, billing_currency, status, is_active,
        sync_enabled, sync_frequency, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        token_id, account_id, account_name, platform, account_type,
        JSON.stringify(permissions), account_owner_name, account_owner_email, timezone,
        country_code, currency, billing_currency, status, is_active,
        sync_enabled, sync_frequency, JSON.stringify(metadata)
      ]
    );

    return await ConnectedAccount.findById(result.insertId);
  }

  // Find account by ID
  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT * FROM connected_accounts WHERE id = ? AND is_active = true`,
      [id]
    );
    if (rows.length > 0) {
      const data = rows[0];
      if (data.permissions) data.permissions = JSON.parse(data.permissions);
      if (data.metadata) data.metadata = JSON.parse(data.metadata);
      return new ConnectedAccount(data);
    }
    return null;
  }

  // Find accounts by token_id
  static async findByTokenId(token_id) {
    const [rows] = await pool.execute(
      `SELECT * FROM connected_accounts WHERE token_id = ? AND is_active = true`,
      [token_id]
    );
    return rows.map(row => {
      if (row.permissions) row.permissions = JSON.parse(row.permissions);
      if (row.metadata) row.metadata = JSON.parse(row.metadata);
      return new ConnectedAccount(row);
    });
  }

  // Find accounts by user and platform via join
  static async findByUserAndPlatform(user_id, platform) {
    const [rows] = await pool.execute(
      `SELECT a.* 
       FROM connected_accounts a
       JOIN ads_tokens t ON a.token_id = t.id
       WHERE t.user_id = ? AND a.platform = ? AND a.is_active = true`,
      [user_id, platform]
    );
    return rows.map(row => {
      if (row.permissions) row.permissions = JSON.parse(row.permissions);
      if (row.metadata) row.metadata = JSON.parse(row.metadata);
      return new ConnectedAccount(row);
    });
  }

  // Update account
  async update(updateData) {
    const allowedFields = [
      'account_name', 'platform', 'account_type', 'permissions',
      'account_owner_name', 'account_owner_email', 'timezone',
      'country_code', 'currency', 'billing_currency', 'status',
      'is_active', 'sync_enabled', 'sync_frequency', 'metadata'
    ];
    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = ?`);
        if (key === 'permissions' || key === 'metadata') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(this.id);

    await pool.execute(
      `UPDATE connected_accounts SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    return await ConnectedAccount.findById(this.id);
  }

  // findone to get account data
  static async findOne({ token_id, account_id }) {
    const [rows] = await pool.execute(    
      `SELECT * FROM connected_accounts WHERE token_id = ? AND account_id = ? AND is_active = true`,
      [token_id, account_id]
    );
    if (rows.length > 0) {
      const data = rows[0];
      if (data.permissions) data.permissions = JSON.parse(data.permissions);
      if (data.metadata) data.metadata = JSON.parse(data.metadata);
      return new ConnectedAccount(data);
    }
    return null;
  }

  // Update account status
  async updateStatus(status) {
    await pool.execute(
      `UPDATE connected_accounts SET status =?, updated_at = CURRENT_TIMESTAMP WHERE id =?`,
      [status, this.id]
    );
    return await ConnectedAccount.findById(this.id);
  }
  // Check if account exists
  static async exists({ token_id, account_id }) {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as count FROM connected_accounts WHERE token_id = ? AND account_id = ? AND is_active = true`,
      [token_id, account_id]
    );
    return rows[0].count > 0;
  }


  // Soft delete account
  async delete() {
    await pool.execute(
      `UPDATE connected_accounts SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
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
      platform: this.platform,
      account_type: this.account_type,
      permissions: this.permissions,
      account_owner_name: this.account_owner_name,
      account_owner_email: this.account_owner_email,
      timezone: this.timezone,
      country_code: this.country_code,
      currency: this.currency,
      billing_currency: this.billing_currency,
      status: this.status,
      is_active: this.is_active,
      sync_enabled: this.sync_enabled,
      last_sync_at: this.last_sync_at,
      sync_frequency: this.sync_frequency,
      metadata: this.metadata,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = ConnectedAccount;
