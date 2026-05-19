const db = require('../database/db');
const logger = require('../utils/logger');

class RefundService {
  async createRefund(orderId, amount, reason) {
    const refundNo = `REF${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const [result] = await db.query(
      'INSERT INTO refunds (order_id, refund_no, amount, reason, status) VALUES (?, ?, ?, ?, ?)',
      [orderId, refundNo, amount, reason, 'pending']
    );

    return { refundId: result.insertId, refundNo, status: 'pending' };
  }

  async processRefundCallback(outRefundNo, refundStatus, failReason = null) {
    await db.transaction(async (connection) => {
      const [refund] = await connection.query(
        'SELECT * FROM refunds WHERE refund_no = ? FOR UPDATE',
        [outRefundNo]
      );

      if (!refund || refund.length === 0) {
        logger.warn(`退款记录不存在: ${outRefundNo}`);
        return;
      }

      if (refund[0].status !== 'pending') {
        logger.info(`退款已处理过，跳过: ${outRefundNo}, 当前状态: ${refund[0].status}`);
        return;
      }

      if (refundStatus === 'SUCCESS') {
        await connection.query(
          'UPDATE refunds SET status = "success", refund_time = NOW() WHERE refund_no = ?',
          [outRefundNo]
        );

        await connection.query(
          'UPDATE orders SET payment_status = "refunded" WHERE id = ?',
          [refund[0].order_id]
        );

        logger.info(`退款成功: ${outRefundNo}`);
      } else if (refundStatus === 'FAIL') {
        await connection.query(
          'UPDATE refunds SET status = "fail", fail_reason = ?, refund_time = NOW() WHERE refund_no = ?',
          [failReason || '未知原因', outRefundNo]
        );

        logger.warn(`退款失败: ${outRefundNo}, 原因: ${failReason}`);
      }
    });
  }

  async getRefundByOrderId(orderId) {
    const [refunds] = await db.query('SELECT * FROM refunds WHERE order_id = ? ORDER BY created_at DESC', [orderId]);
    return refunds.length > 0 ? refunds[0] : null;
  }

  async getRefundByRefundNo(refundNo) {
    const [refunds] = await db.query('SELECT * FROM refunds WHERE refund_no = ?', [refundNo]);
    return refunds.length > 0 ? refunds[0] : null;
  }
}

module.exports = new RefundService();
