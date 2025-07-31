const { pool } = require('../config/database');
const crypto = require('crypto');

class RefreshToken {
  constructor(tokenData) {
    this.id = tokenData.id;
    this.user_id = tokenData.user_id;
    this.token = tokenData.token;
    this.expires_at = tokenData.expires_at;
    this.created_at = tokenData.created_at;
  }

  // Create new refresh token
  static async create(userId, expiresInDays = 30) {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Remove existing tokens for this user
    await RefreshToken.deleteByUserId(userId);

    const [result] = await pool.execute(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, token, expiresAt]
    );

    return await RefreshToken.findById(result.insertId);
  }

  // Find token by ID
  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM refresh_tokens WHERE id = ?',
      [id]
    );

    return rows.length > 0 ? new RefreshToken(rows[0]) : null;
  }

  // Find token by token string
  static async findByToken(token) {
    const [rows] = await pool.execute(
      'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()',
      [token]
    );

    return rows.length > 0 ? new RefreshToken(rows[0]) : null;
  }

  // Delete token by user ID
  static async deleteByUserId(userId) {
    await pool.execute(
      'DELETE FROM refresh_tokens WHERE user_id = ?',
      [userId]
    );
  }

  // Delete token by token string
  static async deleteByToken(token) {
    await pool.execute(
      'DELETE FROM refresh_tokens WHERE token = ?',
      [token]
    );
  }

  // Clean expired tokens
  static async cleanExpired() {
    await pool.execute(
      'DELETE FROM refresh_tokens WHERE expires_at <= NOW()'
    );
  }

  // Check if token is expired
  isExpired() {
    return new Date() > new Date(this.expires_at);
  }

  // Delete this token
  async delete() {
    await pool.execute(
      'DELETE FROM refresh_tokens WHERE id = ?',
      [this.id]
    );
  }
}

module.exports = RefreshToken;