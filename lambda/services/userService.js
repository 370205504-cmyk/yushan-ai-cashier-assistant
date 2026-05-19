const db = require('../database/db');
const logger = require('../utils/logger');
const tokenService = require('./tokenService');
const { logOperation, OPERATION_TYPES } = require('../services/operationLogService');

class UserService {
  async deleteUserData(userId, requestUserId, requestIp) {
    await db.transaction(async (connection) => {
      await connection.query(
        'DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)',
        [userId]
      );

      await connection.query(
        'DELETE FROM orders WHERE user_id = ?',
        [userId]
      );

      await connection.query(
        'DELETE FROM cart_items WHERE user_id = ?',
        [userId]
      );

      await connection.query(
        'DELETE FROM addresses WHERE user_id = ?',
        [userId]
      );

      await connection.query(
        'DELETE FROM users WHERE id = ?',
        [userId]
      );

      logger.info(`用户数据已彻底删除: userId=${userId}`);
    });

    await logOperation(
      requestUserId,
      OPERATION_TYPES.USER_DATA_DELETE,
      {
        deletedUserId: userId,
        reason: '用户主动申请删除'
      },
      requestIp
    );

    return { success: true, message: '用户数据已彻底删除' };
  }

  async anonymizeUserData(userId, requestUserId, requestIp) {
    const anonymousUserId = `deleted_${Date.now()}_${userId}`;
    const randomPhone = `1${Math.floor(Math.random() * 9000000000 + 1000000000)}`;

    await db.transaction(async (connection) => {
      await connection.query(
        'UPDATE users SET user_id = ?, phone = ?, nickname = ?, real_name = NULL WHERE id = ?',
        [anonymousUserId, randomPhone, '已注销用户', userId]
      );

      await connection.query(
        'UPDATE orders SET user_id = NULL WHERE user_id = ?',
        [userId]
      );
    });

    await logOperation(
      requestUserId,
      OPERATION_TYPES.USER_DATA_DELETE,
      {
        deletedUserId: userId,
        mode: 'anonymize',
        reason: '用户主动申请匿名化'
      },
      requestIp
    );

    logger.info(`用户数据已匿名化处理: userId=${userId}`);

    return { success: true, message: '用户数据已匿名化处理' };
  }

  async getDataExport(userId) {
    const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    const orders = await db.query('SELECT * FROM orders WHERE user_id = ?', [userId]);
    const addresses = await db.query('SELECT * FROM addresses WHERE user_id = ?', [userId]);
    const cart = await db.query('SELECT * FROM cart_items WHERE user_id = ?', [userId]);

    return {
      user: user[0] || null,
      orders,
      addresses,
      cart,
      exportedAt: new Date().toISOString()
    };
  }
}

module.exports = new UserService();
