const jwt = require('jsonwebtoken');
const db = require('../database/db');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'yushan-ai-cashier-secret-key';
const TOKEN_EXPIRY = '2h';

class TokenService {
  constructor() {
    this.revokedTokens = new Set();
  }

  generateToken(userId, role = 'user') {
    const token = jwt.sign(
      { userId, role, iat: Math.floor(Date.now() / 1000) },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    return token;
  }

  async storeToken(token, userId) {
    try {
      const ttl = 2 * 60 * 60;
      await db.redis.setEx(`token:${token}`, ttl, String(userId));
      logger.info(`Token stored for user ${userId}`);
    } catch (error) {
      logger.error('Failed to store token in Redis:', error);
      this.revokedTokens.add(token);
    }
  }

  async revokeToken(token) {
    try {
      await db.redis.del(`token:${token}`);
      logger.info('Token revoked successfully');
      return true;
    } catch (error) {
      logger.error('Failed to revoke token:', error);
      this.revokedTokens.add(token);
      return false;
    }
  }

  async isTokenValid(token) {
    try {
      const exists = await db.redis.exists(`token:${token}`);
      return exists === 1;
    } catch (error) {
      logger.error('Redis check failed, falling back to local check:', error);
      return !this.revokedTokens.has(token);
    }
  }

  async revokeAllUserTokens(userId) {
    try {
      const keys = await db.redis.keys(`token:*:${userId}`);
      if (keys.length > 0) {
        await db.redis.del(keys);
      }
      logger.info(`All tokens revoked for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Failed to revoke all user tokens:', error);
      return false;
    }
  }

  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded;
    } catch (error) {
      return null;
    }
  }
}

module.exports = new TokenService();
