const db = require('../database/db');
const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.File({ filename: 'logs/stock.log' })]
});

class StockService {
  constructor() {
    this.LOCK_TIMEOUT = 10;
    this.MAX_RETRY_ATTEMPTS = 3;
  }

  async getStock(dishId) {
    const cacheKey = `stock:${dishId}`;
    const cached = await db.cacheGet(cacheKey);
    if (cached !== null) {
      return { success: true, stock: cached.stock, warning: cached.warning };
    }

    const dishes = await db.query('SELECT stock, stock_warning FROM dishes WHERE id = ?', [dishId]);
    if (dishes.length === 0) {
      return { success: false, message: '菜品不存在' };
    }

    const data = { stock: dishes[0].stock, warning: dishes[0].stock_warning };
    await db.cacheSet(cacheKey, data, 300);
    return { success: true, ...data };
  }

  async updateStock(dishId, quantity, operatorId = null, reason = '') {
    const type = quantity > 0 ? 'add' : 'deduct';
    const actualQuantity = Math.abs(quantity);

    await db.transaction(async (connection) => {
      await connection.query(
        'UPDATE dishes SET stock = stock + ? WHERE id = ?',
        [quantity, dishId]
      );
      await connection.query(
        'INSERT INTO replenish_log (dish_id, quantity, type, operator_id, reason) VALUES (?, ?, ?, ?, ?)',
        [dishId, actualQuantity, type, operatorId, reason]
      );
    });

    await db.cacheDel(`stock:${dishId}`);
    logger.info(`库存更新: 菜品${dishId}, 变更${quantity}, 原因: ${reason}`);
    return { success: true };
  }

  async checkLowStock() {
    const dishes = await db.query(
      'SELECT * FROM dishes WHERE stock > 0 AND stock <= stock_warning AND is_available = 1'
    );

    if (dishes.length > 0) {
      logger.warn(`低库存预警: ${dishes.length}个菜品库存不足`);
    }
    return { success: true, items: dishes };
  }

  async deductStockWithLock(orderItems, orderId = null) {
    let attempt = 0;
    
    while (attempt < this.MAX_RETRY_ATTEMPTS) {
      try {
        return await this._deductStockTransaction(orderItems, orderId);
      } catch (error) {
        attempt++;
        if (error.code === 'ER_LOCK_WAIT_TIMEOUT' && attempt < this.MAX_RETRY_ATTEMPTS) {
          logger.warn(`库存锁定超时，重试第${attempt}次: orderId=${orderId}`);
          await new Promise(resolve => setTimeout(resolve, 100 * attempt));
          continue;
        }
        throw error;
      }
    }
  }

  async _deductStockTransaction(orderItems, orderId) {
    return await db.transaction(async (connection) => {
      for (const item of orderItems) {
        const [dishes] = await connection.query(
          'SELECT id, stock, name FROM dishes WHERE id = ? FOR UPDATE',
          [item.dishId]
        );

        if (dishes.length === 0) {
          throw new Error(`菜品不存在: ${item.dishId}`);
        }

        const dish = dishes[0];
        
        if (dish.stock === null || dish.stock === undefined) {
          continue;
        }

        if (dish.stock < item.quantity) {
          throw new Error(`库存不足: ${dish.name}，剩余${dish.stock}份，需要${item.quantity}份`);
        }

        const [result] = await connection.query(
          'UPDATE dishes SET stock = stock - ? WHERE id = ? AND stock >= ?',
          [item.quantity, item.dishId, item.quantity]
        );

        if (result.affectedRows === 0) {
          const [currentStock] = await connection.query(
            'SELECT stock FROM dishes WHERE id = ?',
            [item.dishId]
          );
          throw new Error(`库存不足: ${dish.name}，下单失败`);
        }
      }

      for (const item of orderItems) {
        await connection.query(
          `INSERT INTO stock_deduction_log (dish_id, order_id, quantity, deducted_at) VALUES (?, ?, ?, NOW())`,
          [item.dishId, orderId, item.quantity]
        );
      }
    });
  }

  async deductStock(orderItems) {
    return await this.deductStockWithLock(orderItems, null);
  }

  async getReplenishHistory(dishId, page = 1, pageSize = 50) {
    const offset = (page - 1) * pageSize;
    const history = await db.query(
      'SELECT * FROM replenish_log WHERE dish_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [dishId, pageSize, offset]
    );
    return { success: true, history };
  }

  async getStockDeductionHistory(dishId, page = 1, pageSize = 50) {
    const offset = (page - 1) * pageSize;
    const history = await db.query(
      'SELECT * FROM stock_deduction_log WHERE dish_id = ? ORDER BY deducted_at DESC LIMIT ? OFFSET ?',
      [dishId, pageSize, offset]
    );
    return { success: true, history };
  }

  async rollbackStock(orderId) {
    await db.transaction(async (connection) => {
      const deductions = await connection.query(
        'SELECT * FROM stock_deduction_log WHERE order_id = ? AND rolled_back = 0',
        [orderId]
      );

      if (deductions.length === 0) {
        return { success: true, message: '没有需要回滚的库存记录' };
      }

      for (const deduction of deductions) {
        await connection.query(
          'UPDATE dishes SET stock = stock + ? WHERE id = ?',
          [deduction.quantity, deduction.dish_id]
        );
        
        await connection.query(
          'UPDATE stock_deduction_log SET rolled_back = 1, rolled_back_at = NOW() WHERE id = ?',
          [deduction.id]
        );
      }

      logger.info(`库存回滚成功: orderId=${orderId}, 数量=${deductions.length}条`);
    });

    return { success: true };
  }
}

module.exports = new StockService();
