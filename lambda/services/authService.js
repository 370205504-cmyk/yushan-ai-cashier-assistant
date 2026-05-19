const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.File({ filename: 'logs/auth.log' })]
});

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;
const TOKEN_EXPIRY = '2h';

class AuthService {
  async register(phone, password, nickname = '') {
    try {
      const existing = await db.query('SELECT id FROM users WHERE phone = ?', [phone]);
      if (existing.length > 0) {
        return { success: false, message: '该手机号已注册' };
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const result = await db.query(
        'INSERT INTO users (phone, password_hash, nickname, password_changed) VALUES (?, ?, ?, 1)',
        [phone, passwordHash, nickname || `用户${phone.slice(-4)}`]
      );

      const token = this.generateToken(result.insertId);
      await this.addPoints(result.insertId, 100, '注册奖励');

      logger.info(`用户注册成功: ${phone}`);
      return {
        success: true,
        message: '注册成功',
        userId: result.insertId,
        token
      };
    } catch (error) {
      logger.error('注册失败:', error);
      throw error;
    }
  }

  async login(phone, password) {
    try {
      const users = await db.query('SELECT * FROM users WHERE phone = ?', [phone]);
      if (users.length === 0) {
        return { success: false, message: '用户不存在' };
      }

      const user = users[0];
      
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
        return { 
          success: false, 
          message: `账户已被锁定，请${minutesLeft}分钟后重试`,
          locked: true,
          lockedUntil: user.locked_until
        };
      }

      if (user.status === 'banned') {
        return { success: false, message: '账号已被禁用' };
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        const attempts = (user.login_attempts || 0) + 1;
        const lockedUntil = attempts >= MAX_LOGIN_ATTEMPTS 
          ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000) 
          : null;
        
        await db.query(
          'UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?',
          [attempts, lockedUntil, user.id]
        );

        logger.warn(`登录失败: ${phone}, 尝试次数: ${attempts}`);
        
        if (lockedUntil) {
          return { 
            success: false, 
            message: `密码错误次数过多，账户已锁定${LOCK_DURATION_MINUTES}分钟`,
            locked: true,
            lockedUntil
          };
        }
        
        return { 
          success: false, 
          message: `密码错误，剩余${MAX_LOGIN_ATTEMPTS - attempts}次机会` 
        };
      }

      if (user.login_attempts > 0 || user.locked_until) {
        await db.query(
          'UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = ?',
          [user.id]
        );
      }
      
      await db.query(
        'UPDATE users SET last_login = NOW(), login_attempts = 0, locked_until = NULL WHERE id = ?',
        [user.id]
      );

      const token = this.generateToken(user.id, user.role);
      logger.info(`用户登录: ${phone}`);

      return {
        success: true,
        message: '登录成功',
        token,
        user: this.sanitizeUser(user),
        requirePasswordChange: user.password_changed === 0
      };
    } catch (error) {
      logger.error('登录失败:', error);
      throw error;
    }
  }

  async wechatLogin(openid, nickname = '', avatar = '') {
    try {
      let users = await db.query('SELECT * FROM users WHERE wechat_openid = ?', [openid]);

      if (users.length === 0) {
        const result = await db.query(
          'INSERT INTO users (wechat_openid, nickname, avatar) VALUES (?, ?, ?)',
          [openid, nickname || '微信用户', avatar]
        );
        await this.addPoints(result.insertId, 100, '注册奖励');
        users = await db.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      }

      const user = users[0];
      const token = this.generateToken(user.id, user.role);
      logger.info(`微信登录: ${openid}`);

      return {
        success: true,
        message: '登录成功',
        token,
        user: this.sanitizeUser(user)
      };
    } catch (error) {
      logger.error('微信登录失败:', error);
      throw error;
    }
  }

  async getUserInfo(userId) {
    const users = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return { success: false, message: '用户不存在' };
    }
    return { success: true, user: this.sanitizeUser(users[0]) };
  }

  async updateUser(userId, data) {
    const allowedFields = ['nickname', 'avatar', 'contact_phone', 'address'];
    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(data[field]);
      }
    }

    if (updates.length === 0) {
      return { success: false, message: '没有可更新的字段' };
    }

    values.push(userId);
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    return { success: true, message: '更新成功' };
  }

  async changePassword(userId, oldPassword, newPassword) {
    try {
      const users = await db.query('SELECT password_hash, password_changed FROM users WHERE id = ?', [userId]);
      if (users.length === 0) {
        return { success: false, message: '用户不存在' };
      }

      const user = users[0];
      
      if (user.password_changed === 0 && oldPassword) {
        return { 
          success: false, 
          message: '首次修改密码不需要验证原密码' 
        };
      }
      
      if (user.password_changed === 1 || oldPassword) {
        const validPassword = await bcrypt.compare(oldPassword, user.password_hash);
        if (!validPassword) {
          return { success: false, message: '原密码错误' };
        }
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await db.query(
        'UPDATE users SET password_hash = ?, password_changed = 1, last_password_change = NOW() WHERE id = ?', 
        [newHash, userId]
      );
      
      logger.info(`用户修改密码: userId=${userId}`);
      return { success: true, message: '密码修改成功' };
    } catch (error) {
      logger.error('修改密码失败:', error);
      throw error;
    }
  }

  async addPoints(userId, points, description = '') {
    await db.transaction(async (connection) => {
      await connection.query('UPDATE users SET points = points + ? WHERE id = ?', [points, userId]);
      const [users] = await connection.query('SELECT points FROM users WHERE id = ?', [userId]);
      await connection.query(
        'INSERT INTO points_log (user_id, type, points, balance, description) VALUES (?, ?, ?, ?, ?)',
        [userId, 'earn', points, users[0].points, description]
      );
    });
  }

  async getPointsHistory(userId, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const logs = await db.query(
      'SELECT * FROM points_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, pageSize, offset]
    );
    const [{ total }] = await db.query('SELECT COUNT(*) as total FROM points_log WHERE user_id = ?', [userId]);
    return { success: true, logs, total, page, pageSize };
  }

  generateToken(userId, role = 'user') {
    const secret = process.env.JWT_SECRET || 'yushan-ai-cashier-jwt-secret-key';
    return jwt.sign(
      { userId, role, iat: Math.floor(Date.now() / 1000) }, 
      secret, 
      { expiresIn: TOKEN_EXPIRY }
    );
  }

  verifyToken(token) {
    try {
      const secret = process.env.JWT_SECRET || 'yushan-ai-cashier-jwt-secret-key';
      return jwt.verify(token, secret);
    } catch (error) {
      logger.warn('Token验证失败:', error.message);
      return null;
    }
  }

  sanitizeUser(user) {
    const { password_hash, ...sanitized } = user;
    return sanitized;
  }
}

module.exports = new AuthService();
