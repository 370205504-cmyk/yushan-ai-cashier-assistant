const db = require('../database/db');
const winston = require('winston');
const logger = require('../utils/logger');

const RATE_LIMIT_CONFIG = {
  POINTS_CLAIM_INTERVAL: 60 * 60 * 1000,
  COUPON_CLAIM_INTERVAL: 60 * 60 * 1000,
  MAX_COUPONS_PER_IP_DAILY: 5,
  MAX_RECHARGE_AMOUNT: 99999.99,
  MIN_RECHARGE_AMOUNT: 10
};

class MemberService {
  async getMemberInfo(userId) {
    const users = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return { success: false, message: '用户不存在' };
    }

    const user = users[0];
    const levelInfo = this.getLevelInfo(user.level);
    const orderCount = await db.query('SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND payment_status = ?', [userId, 'paid']);
    const totalSpent = await db.query('SELECT SUM(final_amount) as total FROM orders WHERE user_id = ? AND payment_status = ?', [userId, 'paid']);

    return {
      success: true,
      member: {
        level: user.level,
        levelName: levelInfo.name,
        points: user.points,
        balance: user.balance,
        orderCount: orderCount[0].count,
        totalSpent: totalSpent[0].total || 0,
        nextLevelPoints: levelInfo.nextLevelPoints
      }
    };
  }

  async recharge(userId, amount) {
    if (amount < RATE_LIMIT_CONFIG.MIN_RECHARGE_AMOUNT) {
      logger.logSecurity('RECHARGE_AMOUNT_TOO_SMALL', '充值金额低于最低限制', {
        userId,
        amount,
        minAmount: RATE_LIMIT_CONFIG.MIN_RECHARGE_AMOUNT
      });
      return { success: false, message: `最低充值${RATE_LIMIT_CONFIG.MIN_RECHARGE_AMOUNT}元` };
    }

    if (amount > RATE_LIMIT_CONFIG.MAX_RECHARGE_AMOUNT) {
      logger.logSecurity('RECHARGE_AMOUNT_TOO_LARGE', '充值金额超过最高限制', {
        userId,
        amount,
        maxAmount: RATE_LIMIT_CONFIG.MAX_RECHARGE_AMOUNT
      });
      return { success: false, message: `单次充值不能超过${RATE_LIMIT_CONFIG.MAX_RECHARGE_AMOUNT}元` };
    }

    if (amount.toString().split('.')[1]?.length > 2) {
      return { success: false, message: '充值金额最多支持两位小数' };
    }

    await db.transaction(async (connection) => {
      await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, userId]);
      const [users] = await connection.query('SELECT balance FROM users WHERE id = ?', [userId]);
      await connection.query(
        'INSERT INTO points_log (user_id, type, points, balance, description) VALUES (?, ?, ?, ?, ?)',
        [userId, 'earn', Math.floor(amount), users[0].balance, '充值赠送积分']
      );
    });

    logger.logOperation(userId, '充值成功', { amount });
    return { success: true, message: '充值成功' };
  }

  async useBalance(userId, amount) {
    const users = await db.query('SELECT balance FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return { success: false, message: '用户不存在' };
    }

    if (users[0].balance < amount) {
      return { success: false, message: '余额不足' };
    }

    await db.transaction(async (connection) => {
      await connection.query('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, userId]);
    });

    return { success: true, message: '余额扣费成功' };
  }

  async getCoupons(userId, status = 'unused') {
    const coupons = await db.query(
      `SELECT uc.*, c.name, c.type, c.value, c.min_amount, c.end_date
       FROM user_coupons uc
       JOIN coupons c ON uc.coupon_id = c.id
       WHERE uc.user_id = ? AND uc.status = ?
       ORDER BY uc.created_at DESC`,
      [userId, status]
    );
    return { success: true, coupons };
  }

  async claimCoupon(userId, couponCode, ipAddress = '') {
    const coupons = await db.query('SELECT * FROM coupons WHERE code = ? AND status = ?', [couponCode, 'active']);
    if (coupons.length === 0) {
      return { success: false, message: '优惠券不存在或已失效' };
    }

    const coupon = coupons[0];
    if (coupon.remaining_count <= 0) {
      return { success: false, message: '优惠券已领完' };
    }

    if (new Date() < new Date(coupon.start_date) || new Date() > new Date(coupon.end_date)) {
      return { success: false, message: '优惠券不在领取时间内' };
    }

    const existing = await db.query(
      'SELECT id FROM user_coupons WHERE user_id = ? AND coupon_id = ?',
      [userId, coupon.id]
    );
    if (existing.length > 0) {
      return { success: false, message: '您已领取过该优惠券' };
    }

    const lastClaim = await db.query(
      'SELECT created_at FROM user_coupons WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    if (lastClaim.length > 0) {
      const lastClaimTime = new Date(lastClaim[0].created_at).getTime();
      const now = Date.now();
      if (now - lastClaimTime < RATE_LIMIT_CONFIG.COUPON_CLAIM_INTERVAL) {
        const remainingTime = Math.ceil((RATE_LIMIT_CONFIG.COUPON_CLAIM_INTERVAL - (now - lastClaimTime)) / 60000);
        logger.logSecurity('COUPON_CLAIM_RATE_LIMIT', '优惠券领取频率超限', {
          userId,
          couponCode,
          remainingMinutes: remainingTime
        });
        return { success: false, message: `领取过于频繁，请${remainingTime}分钟后再试` };
      }
    }

    if (ipAddress) {
      const today = new Date().toISOString().split('T')[0];
      const ipClaimCount = await db.query(
        `SELECT COUNT(*) as count FROM user_coupons uc
         JOIN coupon_claim_log ccl ON uc.id = ccl.coupon_id
         WHERE ccl.ip_address = ? AND ccl.created_at >= ?`,
        [ipAddress, today]
      );
      if (ipClaimCount[0].count >= RATE_LIMIT_CONFIG.MAX_COUPONS_PER_IP_DAILY) {
        logger.logSecurity('COUPON_CLAIM_IP_LIMIT', 'IP领取优惠券数量超限', {
          ipAddress,
          couponCode,
          count: ipClaimCount[0].count
        });
        return { success: false, message: '今日领取优惠券数量已达上限' };
      }
    }

    await db.transaction(async (connection) => {
      await connection.query('UPDATE coupons SET remaining_count = remaining_count - 1 WHERE id = ?', [coupon.id]);
      const [insertResult] = await connection.query('INSERT INTO user_coupons (user_id, coupon_id) VALUES (?, ?)', [userId, coupon.id]);
      
      if (ipAddress && insertResult.insertId) {
        await connection.query(
          'INSERT INTO coupon_claim_log (coupon_id, user_id, ip_address) VALUES (?, ?, ?)',
          [coupon.id, userId, ipAddress]
        );
      }
    });

    logger.logOperation(userId, '领取优惠券', { couponCode });
    return { success: true, message: '领取成功' };
  }

  async useCoupon(userId, couponId, orderId) {
    await db.transaction(async (connection) => {
      await connection.query('UPDATE user_coupons SET status = ?, used_at = NOW(), order_id = ? WHERE id = ?', ['used', orderId, couponId]);
    });
    return { success: true };
  }

  async claimDailyPoints(userId) {
    const lastClaim = await db.query(
      'SELECT created_at FROM points_log WHERE user_id = ? AND type = ? ORDER BY created_at DESC LIMIT 1',
      [userId, 'daily_claim']
    );

    if (lastClaim.length > 0) {
      const lastClaimTime = new Date(lastClaim[0].created_at).getTime();
      const now = Date.now();
      if (now - lastClaimTime < RATE_LIMIT_CONFIG.POINTS_CLAIM_INTERVAL) {
        const remainingHours = Math.ceil((RATE_LIMIT_CONFIG.POINTS_CLAIM_INTERVAL - (now - lastClaimTime)) / 3600000);
        logger.logSecurity('POINTS_CLAIM_RATE_LIMIT', '积分领取频率超限', {
          userId,
          remainingHours
        });
        return { success: false, message: `积分领取过于频繁，请${remainingHours}小时后再试` };
      }
    }

    const dailyPoints = 10;
    await db.transaction(async (connection) => {
      await connection.query('UPDATE users SET points = points + ? WHERE id = ?', [dailyPoints, userId]);
      const [users] = await connection.query('SELECT points FROM users WHERE id = ?', [userId]);
      await connection.query(
        'INSERT INTO points_log (user_id, type, points, balance, description) VALUES (?, ?, ?, ?, ?)',
        [userId, 'daily_claim', dailyPoints, users[0].points, '每日签到领取积分']
      );
    });

    logger.logOperation(userId, '领取每日积分', { points: dailyPoints });
    return { success: true, message: `成功领取${dailyPoints}积分`, points: dailyPoints };
  }

  getLevelInfo(level) {
    const levels = [
      { level: 1, name: '普通会员', nextLevelPoints: 1000 },
      { level: 2, name: '银卡会员', nextLevelPoints: 5000 },
      { level: 3, name: '金卡会员', nextLevelPoints: 10000 },
      { level: 4, name: '白金会员', nextLevelPoints: 50000 },
      { level: 5, name: '钻石会员', nextLevelPoints: null }
    ];
    return levels.find(l => l.level === level) || levels[0];
  }

  async updateLevel(userId) {
    const users = await db.query('SELECT points, level FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return;
    }

    const newLevel = this.calculateLevel(users[0].points);
    if (newLevel > users[0].level) {
      await db.query('UPDATE users SET level = ? WHERE id = ?', [newLevel, userId]);
      logger.info(`用户${userId}升级为${newLevel}级会员`);
    }
  }

  calculateLevel(points) {
    if (points >= 50000) {
      return 5;
    }
    if (points >= 10000) {
      return 4;
    }
    if (points >= 5000) {
      return 3;
    }
    if (points >= 1000) {
      return 2;
    }
    return 1;
  }
}

module.exports = new MemberService();
