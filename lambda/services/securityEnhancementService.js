const db = require('../database/db');
const logger = require('../utils/logger');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/**
 * 安全加固服务
 */
class SecurityEnhancementService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'yushan-ai-cashier-jwt-secret-key-change-in-production';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '2h';
    this.jwtRefreshExpiresIn = '30d';
  }

  /**
   * 安全哈希密码
   */
  hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return { salt, hash };
  }

  /**
   * 验证密码
   */
  verifyPassword(password, salt, hash) {
    const computedHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(computedHash));
  }

  /**
   * 生成JWT Token
   */
  generateJwtToken(userId, role = 'user') {
    const payload = {
      userId,
      role,
      type: 'access',
      iat: Math.floor(Date.now() / 1000)
    };

    const token = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
      issuer: 'yushan-ai-cashier'
    });

    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      this.jwtSecret,
      { expiresIn: this.jwtRefreshExpiresIn, issuer: 'yushan-ai-cashier' }
    );

    logger.logOperation(userId, 'JWT Token生成', { role });

    return { token, refreshToken, expiresIn: this.jwtExpiresIn };
  }

  /**
   * 验证JWT Token
   */
  verifyJwtToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: 'yushan-ai-cashier'
      });
      return { valid: true, decoded };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return { valid: false, error: 'token_expired', message: 'Token已过期' };
      }
      if (error.name === 'JsonWebTokenError') {
        return { valid: false, error: 'invalid_token', message: '无效的Token' };
      }
      return { valid: false, error: 'verification_failed', message: '验证失败' };
    }
  }

  /**
   * 验证支付回调签名
   */
  verifyPaymentSignature(data, signature, apiKey) {
    try {
      if (!data || !signature) {
        logger.logSecurity('支付回调', '缺少数据或签名', { hasData: !!data, hasSignature: !!signature });
        return false;
      }

      const sortedKeys = Object.keys(data).sort();
      let signStr = sortedKeys.map(key => `${key}=${data[key]}`).join('&');
      signStr += `&key=${apiKey}`;

      const computedSign = crypto.createHash('md5').update(signStr, 'utf8').digest('hex').toUpperCase();
      
      const isValid = crypto.timingSafeEqual(
        Buffer.from(computedSign),
        Buffer.from(signature.toUpperCase())
      );

      if (!isValid) {
        logger.logSecurity('支付回调', '签名验证失败', { received: signature, computed: computedSign });
      }

      return isValid;
    } catch (error) {
      logger.error('支付签名验证异常', { error: error.message });
      return false;
    }
  }

  /**
   * 检查测试账号状态
   */
  async checkTestAccountStatus() {
    try {
      const testAccounts = await db.query(
        "SELECT * FROM users WHERE phone LIKE ? OR nickname LIKE ?",
        ['%13800138000%', '%test%']
      );

      const hasTestAccounts = testAccounts.length > 0;
      
      if (hasTestAccounts) {
        logger.logSecurity('安全检查', '发现测试账号', { count: testAccounts.length });
      }

      return {
        hasTestAccounts,
        testAccounts: testAccounts.map(a => ({
          id: a.id,
          userId: a.user_id,
          phone: a.phone,
          nickname: a.nickname,
          role: a.role
        })),
        recommendation: '生产环境建议禁用或删除测试账号'
      };
    } catch (error) {
      logger.error('检查测试账号失败', { error: error.message });
      return { error: '检查失败' };
    }
  }

  /**
   * 禁用测试账号
   */
  async disableTestAccount(userId) {
    try {
      await db.query('UPDATE users SET status = ? WHERE user_id = ?', ['disabled', userId]);
      logger.logSecurity('安全操作', '禁用测试账号', { userId });
      return { success: true, message: '账号已禁用' };
    } catch (error) {
      logger.error('禁用测试账号失败', { error: error.message, userId });
      return { success: false, message: '操作失败' };
    }
  }

  /**
   * 记录安全事件
   */
  async logSecurityEvent(eventType, description, metadata = {}) {
    try {
      logger.logSecurity(eventType, description, metadata);
      
      // 如果有安全日志表，可以存储到数据库
      // 这里仅做日志记录
      
      if (['critical', 'error'].includes(eventType)) {
        // 可以在这里添加告警通知逻辑
        this.sendSecurityAlert(eventType, description, metadata);
      }
    } catch (error) {
      console.error('记录安全事件失败', error);
    }
  }

  /**
   * 发送安全告警
   */
  sendSecurityAlert(level, message, metadata = {}) {
    logger.error(`[安全告警 ${level.toUpperCase()}] ${message}`, metadata);
    // 可以扩展为发送邮件、短信、钉钉等通知
  }

  /**
   * 参数化查询验证 - 确保使用参数化查询
   */
  sanitizeInput(input) {
    if (typeof input === 'string') {
      // 基础的输入清理
      return input.replace(/[<>;"'\\]/g, '');
    }
    return input;
  }

  /**
   * 检查权限
   */
  checkPermission(userRole, requiredPermission) {
    const rolePermissions = {
      'user': ['view', 'order'],
      'staff': ['view', 'order', 'manage_orders'],
      'manager': ['view', 'order', 'manage_orders', 'manage_staff'],
      'admin': ['view', 'order', 'manage_orders', 'manage_staff', 'manage_settings', 'system_config']
    };

    const permissions = rolePermissions[userRole] || [];
    return permissions.includes(requiredPermission);
  }
}

module.exports = new SecurityEnhancementService();
