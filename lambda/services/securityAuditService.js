const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('../database/db');
const logger = require('../utils/logger');

class SecurityAuditService {
  constructor() {
    this.auditLog = [];
    this.maxLogSize = 1000;
  }

  async logSecurityEvent(eventType, details, ip = null, userId = null) {
    const event = {
      timestamp: new Date().toISOString(),
      type: eventType,
      details,
      ip,
      userId,
      hash: this.generateEventHash(eventType, details)
    };

    this.auditLog.push(event);
    if (this.auditLog.length > this.maxLogSize) {
      this.auditLog.shift();
    }

    try {
      if (db.pool) {
        await db.query(
          'INSERT INTO security_audit_log (event_type, details, ip, user_id, event_hash) VALUES (?, ?, ?, ?, ?)',
          [eventType, JSON.stringify(details), ip, userId, event.hash]
        );
      }
    } catch (error) {
      logger.error('Failed to log security event to database:', error);
    }

    logger.info('Security Event:', event);
    return event;
  }

  generateEventHash(eventType, details) {
    const data = `${eventType}-${JSON.stringify(details)}-${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
  }

  async recordLoginAttempt(phone, success, ip, userAgent) {
    const eventType = success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED';
    await this.logSecurityEvent(
      eventType,
      { phone: this.maskPhone(phone) },
      ip,
      success ? null : undefined
    );
  }

  async recordPasswordChange(userId, ip) {
    await this.logSecurityEvent('PASSWORD_CHANGED', { userId }, ip, userId);
  }

  async recordSensitiveOperation(operation, details, userId, ip) {
    await this.logSecurityEvent(
      'SENSITIVE_OPERATION',
      { operation, ...details },
      ip,
      userId
    );
  }

  async recordPaymentCallback(callbackData, ip, verified) {
    await this.logSecurityEvent(
      'PAYMENT_CALLBACK',
      { verified, callbackType: callbackData.type },
      ip
    );
  }

  async recordUnauthorizedAccess(endpoint, ip, method) {
    await this.logSecurityEvent(
      'UNAUTHORIZED_ACCESS',
      { endpoint, method },
      ip
    );
  }

  async recordSuspiciousActivity(activity, details, ip) {
    await this.logSecurityEvent(
      'SUSPICIOUS_ACTIVITY',
      { activity, ...details },
      ip
    );
  }

  maskPhone(phone) {
    if (!phone || phone.length !== 11) return '****';
    return `${phone.substring(0, 3)}****${phone.substring(7)}`;
  }

  maskEmail(email) {
    if (!email || !email.includes('@')) return '****';
    const [local, domain] = email.split('@');
    const maskedLocal = local.length > 2 
      ? `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}` 
      : '**';
    return `${maskedLocal}@${domain}`;
  }

  async getAuditLog(page = 1, pageSize = 50, filters = {}) {
    try {
      if (!db.pool) {
        return {
          success: true,
          logs: this.auditLog.slice(-pageSize),
          total: this.auditLog.length,
          page,
          pageSize
        };
      }

      let whereClause = '1=1';
      const params = [];

      if (filters.eventType) {
        whereClause += ' AND event_type = ?';
        params.push(filters.eventType);
      }
      if (filters.startDate) {
        whereClause += ' AND created_at >= ?';
        params.push(filters.startDate);
      }
      if (filters.endDate) {
        whereClause += ' AND created_at <= ?';
        params.push(filters.endDate);
      }
      if (filters.userId) {
        whereClause += ' AND user_id = ?';
        params.push(filters.userId);
      }
      if (filters.ip) {
        whereClause += ' AND ip LIKE ?';
        params.push(`%${filters.ip}%`);
      }

      const offset = (page - 1) * pageSize;
      const logs = await db.query(
        `SELECT * FROM security_audit_log WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
      const [{ total }] = await db.query(
        `SELECT COUNT(*) as total FROM security_audit_log WHERE ${whereClause}`,
        params
      );

      return { success: true, logs, total, page, pageSize };
    } catch (error) {
      logger.error('Failed to get audit log:', error);
      return { success: false, message: '获取审计日志失败' };
    }
  }

  async getSecurityStats(startDate, endDate) {
    try {
      if (!db.pool) {
        const stats = {
          loginAttempts: this.auditLog.filter(e => e.type.includes('LOGIN')).length,
          failedLogins: this.auditLog.filter(e => e.type === 'LOGIN_FAILED').length,
          suspiciousActivities: this.auditLog.filter(e => e.type === 'SUSPICIOUS_ACTIVITY').length,
          unauthorizedAccess: this.auditLog.filter(e => e.type === 'UNAUTHORIZED_ACCESS').length
        };
        return { success: true, stats };
      }

      let whereClause = '1=1';
      const params = [];
      if (startDate) {
        whereClause += ' AND created_at >= ?';
        params.push(startDate);
      }
      if (endDate) {
        whereClause += ' AND created_at <= ?';
        params.push(endDate);
      }

      const [loginStats] = await db.query(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN event_type = 'LOGIN_FAILED' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN event_type = 'LOGIN_SUCCESS' THEN 1 ELSE 0 END) as success
         FROM security_audit_log WHERE ${whereClause}`,
        params
      );

      const [suspiciousStats] = await db.query(
        `SELECT COUNT(*) as count FROM security_audit_log WHERE ${whereClause} AND event_type IN ('SUSPICIOUS_ACTIVITY', 'UNAUTHORIZED_ACCESS')`,
        params
      );

      return {
        success: true,
        stats: {
          loginAttempts: loginStats.total || 0,
          failedLogins: loginStats.failed || 0,
          successfulLogins: loginStats.success || 0,
          suspiciousActivities: suspiciousStats.count || 0
        }
      };
    } catch (error) {
      logger.error('Failed to get security stats:', error);
      return { success: false, message: '获取安全统计失败' };
    }
  }
}

module.exports = new SecurityAuditService();
