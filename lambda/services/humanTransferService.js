const db = require('../database/db');
const logger = require('../utils/logger');

const TRANSFER_CONFIG = {
  MAX_AUTO_ATTEMPTS: 3,
  MAX_TRANSFERS_PER_DAY: 5,
  VIP_LEVEL_THRESHOLD: 3,
  KEYWORDS_TRIGGER: ['人工', '客服', '转接', '投诉', '退款', '投诉', '问题', '错误'],
  MIN_WAIT_SECONDS: 300
};

class HumanTransferService {
  constructor() {
    this.transferRequests = new Map();
  }

  async shouldTransferToHuman(userId, conversationHistory = [], userLevel = 1) {
    const transferReasons = [];

    // 检查用户等级
    if (userLevel >= TRANSFER_CONFIG.VIP_LEVEL_THRESHOLD) {
      transferReasons.push('VIP用户直接转人工');
    }

    // 检查关键词触发
    const lastMessages = conversationHistory.slice(-5);
    const hasTriggerKeyword = lastMessages.some(msg => 
      TRANSFER_CONFIG.KEYWORDS_TRIGGER.some(keyword => 
        msg?.content?.toLowerCase().includes(keyword)
      )
    );
    if (hasTriggerKeyword) {
      transferReasons.push('检测到人工触发关键词');
    }

    // 检查连续失败次数
    const failedAttempts = await this.getFailedAttempts(userId);
    if (failedAttempts >= TRANSFER_CONFIG.MAX_AUTO_ATTEMPTS) {
      transferReasons.push(`连续${TRANSFER_CONFIG.MAX_AUTO_ATTEMPTS}次自动处理失败`);
    }

    // 检查今日转人工次数
    const todayTransfers = await this.getTodayTransferCount(userId);
    if (todayTransfers >= TRANSFER_CONFIG.MAX_TRANSFERS_PER_DAY) {
      return { shouldTransfer: false, reason: '今日转人工次数已达上限', reasons: [] };
    }

    // 检查冷却时间
    const lastTransfer = await this.getLastTransferTime(userId);
    if (lastTransfer) {
      const now = Date.now();
      const diffSeconds = (now - new Date(lastTransfer).getTime()) / 1000;
      if (diffSeconds < TRANSFER_CONFIG.MIN_WAIT_SECONDS) {
        const remainingMinutes = Math.ceil((TRANSFER_CONFIG.MIN_WAIT_SECONDS - diffSeconds) / 60);
        return { shouldTransfer: false, reason: `请${remainingMinutes}分钟后再尝试转人工`, reasons: [] };
      }
    }

    if (transferReasons.length > 0) {
      return { shouldTransfer: true, reason: transferReasons.join('; '), reasons: transferReasons };
    }

    return { shouldTransfer: false, reason: '未满足转人工条件', reasons: [] };
  }

  async requestTransfer(userId, userLevel, reason, context = {}) {
    const checkResult = await this.shouldTransferToHuman(userId, [], userLevel);
    
    if (!checkResult.shouldTransfer) {
      return { success: false, message: checkResult.reason };
    }

    await db.transaction(async (connection) => {
      await connection.query(
        'INSERT INTO human_transfer_log (user_id, user_level, reason, context, status) VALUES (?, ?, ?, ?, ?)',
        [userId, userLevel, reason, JSON.stringify(context), 'pending']
      );

      await connection.query(
        'UPDATE users SET failed_attempts = 0 WHERE id = ?',
        [userId]
      );
    });

    logger.logOperation(userId, '请求转人工', {
      userLevel,
      reason,
      context
    });

    return { success: true, message: '已为您转接人工客服，请稍候...' };
  }

  async getFailedAttempts(userId) {
    const users = await db.query('SELECT failed_attempts FROM users WHERE id = ?', [userId]);
    return users.length > 0 ? users[0].failed_attempts || 0 : 0;
  }

  async incrementFailedAttempts(userId) {
    await db.query(
      'UPDATE users SET failed_attempts = COALESCE(failed_attempts, 0) + 1 WHERE id = ?',
      [userId]
    );
  }

  async resetFailedAttempts(userId) {
    await db.query('UPDATE users SET failed_attempts = 0 WHERE id = ?', [userId]);
  }

  async getTodayTransferCount(userId) {
    const today = new Date().toISOString().split('T')[0];
    const counts = await db.query(
      'SELECT COUNT(*) as count FROM human_transfer_log WHERE user_id = ? AND created_at >= ?',
      [userId, today]
    );
    return counts[0].count || 0;
  }

  async getLastTransferTime(userId) {
    const logs = await db.query(
      'SELECT created_at FROM human_transfer_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    return logs.length > 0 ? logs[0].created_at : null;
  }

  async getTransferHistory(userId, limit = 10) {
    const logs = await db.query(
      'SELECT * FROM human_transfer_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    );
    return logs.map(log => ({
      ...log,
      context: log.context ? JSON.parse(log.context) : {}
    }));
  }

  async updateTransferStatus(logId, status, handlerId = null) {
    await db.query(
      'UPDATE human_transfer_log SET status = ?, handler_id = ?, handled_at = NOW() WHERE id = ?',
      [status, handlerId, logId]
    );
  }
}

module.exports = new HumanTransferService();