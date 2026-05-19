const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.File({ filename: 'logs/auth.log' })]
});

class SecureAuthService {
  constructor() {
    this.secretKey = process.env.JWT_SECRET || 'change-this-in-production';
    this.adminApiKey = process.env.ADMIN_API_KEY || '';
    this.tokenExpiry = process.env.JWT_EXPIRES_IN || '2h';
  }

  generateToken(userId, phone, role = 'user') {
    const payload = {
      userId,
      phone,
      role,
      type: 'access'
    };

    const token = jwt.sign(payload, this.secretKey, {
      expiresIn: this.tokenExpiry,
      issuer: 'yushan-ai-cashier'
    });

    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      this.secretKey,
      { expiresIn: '30d', issuer: 'yushan-ai-cashier' }
    );

    logger.info('Token生成', { userId, role });

    return { token, refreshToken };
  }

  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.secretKey, {
        issuer: 'yushan-ai-cashier'
      });
      return { valid: true, decoded };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return { valid: false, error: 'token_expired' };
      }
      if (error.name === 'JsonWebTokenError') {
        return { valid: false, error: 'invalid_token' };
      }
      return { valid: false, error: 'verification_failed' };
    }
  }

  refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, this.secretKey, {
        issuer: 'yushan-ai-cashier'
      });

      if (decoded.type !== 'refresh') {
        return { success: false, error: 'invalid_refresh_token' };
      }

      return this.generateToken(decoded.userId, null, decoded.role);
    } catch (error) {
      return { success: false, error: 'refresh_failed' };
    }
  }

  generateSecureUserId() {
    return `u_${crypto.randomBytes(16).toString('hex')}`;
  }

  verifyAdminApiKey(apiKey) {
    if (!this.adminApiKey) {
      logger.warn('ADMIN_API_KEY未配置，使用默认验证');
      return apiKey === 'admin-secret-key-change-in-production';
    }
    return crypto.timingSafeEqual(
      Buffer.from(apiKey),
      Buffer.from(this.adminApiKey)
    );
  }

  hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return { salt, hash };
  }

  verifyPassword(password, salt, hash) {
    const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(verifyHash));
  }
}

module.exports = new SecureAuthService();
