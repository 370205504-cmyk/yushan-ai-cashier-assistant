const cron = require('node-cron');
const db = require('../database/db');
const logger = require('../utils/logger');

async function processExpiredOrders() {
  try {
    await db.transaction(async (connection) => {
      const [expiredOrders] = await connection.query(
        `SELECT o.id, o.order_no, o.items, o.status, o.payment_status
         FROM orders o
         WHERE o.status = 'pending'
         AND o.payment_status = 'unpaid'
         AND o.pay_expire_at < NOW()
         FOR UPDATE`
      );

      if (expiredOrders.length === 0) {
        return;
      }

      logger.info(`发现${expiredOrders.length}个过期订单`);

      for (const order of expiredOrders) {
        try {
          let items = order.items;
          if (typeof items === 'string') {
            items = JSON.parse(items);
          }

          for (const item of items) {
            await connection.query(
              'UPDATE dishes SET stock = stock + ? WHERE id = ?',
              [item.quantity || 1, item.dishId]
            );
          }

          await connection.query(
            'UPDATE orders SET status = \'expired\', updated_at = NOW() WHERE id = ?',
            [order.id]
          );

          logger.info(`过期订单已关闭: ${order.order_no}`);
        } catch (itemError) {
          logger.error(`处理过期订单失败: ${order.order_no}`, itemError);
        }
      }
    });

    logger.info('过期订单处理完成');
  } catch (error) {
    logger.error('过期订单处理失败:', error);
  }
}

async function cleanupExpiredCarts() {
  try {
    const result = await db.query(
      'DELETE FROM carts WHERE updated_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
    );
    if (result.affectedRows > 0) {
      logger.info(`清理了${result.affectedRows}个过期购物车`);
    }
  } catch (error) {
    logger.error('购物车清理失败:', error);
  }
}

async function archiveOldOrders() {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const [oldOrders] = await db.query(
      'SELECT * FROM orders WHERE created_at < ? AND status IN (\'completed\', \'cancelled\', \'expired\')',
      [threeMonthsAgo]
    );

    if (oldOrders.length === 0) {
      logger.info('无需归档的历史订单');
      return;
    }

    logger.info(`准备归档${oldOrders.length}条历史订单`);

    for (const order of oldOrders) {
      try {
        await db.query(
          'INSERT INTO orders_archive SELECT * FROM orders WHERE id = ?',
          [order.id]
        );

        await db.query('DELETE FROM order_items WHERE order_id = ?', [order.id]);
        await db.query('DELETE FROM orders WHERE id = ?', [order.id]);

        logger.info(`订单归档完成: ${order.order_no}`);
      } catch (archiveError) {
        logger.error(`归档订单失败: ${order.order_no}`, archiveError);
      }
    }

    logger.info('历史订单归档完成');
  } catch (error) {
    logger.error('订单归档失败:', error);
  }
}

function startScheduler() {
  cron.schedule('* * * * *', async () => {
    await processExpiredOrders();
  });

  cron.schedule('0 3 * * *', async () => {
    await cleanupExpiredCarts();
  });

  cron.schedule('0 4 1 * *', async () => {
    await archiveOldOrders();
  });

  logger.info('定时任务调度器已启动');
}

module.exports = {
  startScheduler,
  processExpiredOrders,
  cleanupExpiredCarts,
  archiveOldOrders
};
