const prisma = require('../config/prisma');
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

    const createdToken = await prisma.refresh_tokens.create({
      data: {
        user_id: parseInt(userId),
        token,
        expires_at: expiresAt
      }
    });

    return new RefreshToken(createdToken);
  }

  // Find token by ID
  static async findById(id) {
    const token = await prisma.refresh_tokens.findFirst({
      where: {
        id: parseInt(id)
      }
    });

    return token ? new RefreshToken(token) : null;
  }

  // Find token by token string
  static async findByToken(token) {
    const foundToken = await prisma.refresh_tokens.findFirst({
      where: {
        token,
        expires_at: {
          gt: new Date()
        }
      }
    });

    return foundToken ? new RefreshToken(foundToken) : null;
  }

  // Delete token by user ID
  static async deleteByUserId(userId) {
    await prisma.refresh_tokens.deleteMany({
      where: {
        user_id: parseInt(userId)
      }
    });
  }

  // Delete token by token string
  static async deleteByToken(token) {
    await prisma.refresh_tokens.deleteMany({
      where: {
        token
      }
    });
  }

  // Clean expired tokens
  static async cleanExpired() {
    await prisma.refresh_tokens.deleteMany({
      where: {
        expires_at: {
          lte: new Date()
        }
      }
    });
  }

  // Check if token is expired
  isExpired() {
    return new Date() > new Date(this.expires_at);
  }

  // Delete this token
  async delete() {
    await prisma.refresh_tokens.deleteMany({
      where: {
        id: this.id
      }
    });
  }
}

module.exports = RefreshToken;