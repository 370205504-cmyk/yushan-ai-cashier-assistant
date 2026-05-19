const db = require('../database/db');
const logger = require('../utils/logger');
const alertService = require('./alertService');

class DatabaseMonitor {
  constructor(options = {}) {
    this.checkInterval = null;
    this.intervalMs = options.intervalMs || 60 * 1000;
    this.alertThreshold = options.alertThreshold || 10;
  }

  async checkPoolStatus() {
    try {
      if (!db.pool || !db.pool.pool) {
        return null;
      }

      const pool = db.pool.pool;
      const status = {
        allConnections: pool._allConnections?.length || 0,
        freeConnections: pool._freeConnections?.length || 0,
        connectionQueue: pool._connectionQueue?.length || 0,
        timestamp: new Date().toISOString()
      };

      logger.info(`数据库连接池状态: 活跃=${status.allConnections}, 空闲=${status.freeConnections}, 排队=${status.connectionQueue}`);

      if (status.connectionQueue > this.alertThreshold) {
        await alertService.sendAlert(
          '数据库连接池排队过长',
          `当前排队请求数: ${status.connectionQueue}，请检查数据库性能或增加连接数`,
          'warn'
        );
      }

      if (status.allConnections >= 20 && status.freeConnections === 0) {
        await alertService.sendAlert(
          '数据库连接池即将耗尽',
          `活跃连接数: ${status.allConnections}，空闲连接数: 0，请立即处理`,
          'error'
        );
      }

      return status;
    } catch (error) {
      logger.error('检查连接池状态失败:', error);
      return null;
    }
  }

  async optimizeIndexes() {
    try {
      const tables = ['orders', 'users', 'dishes', 'cart_items', 'order_items'];

      for (const table of tables) {
        await db.query(`OPTIMIZE TABLE ${table}`);
        logger.info(`索引优化完成: ${table}`);
      }

      logger.info('数据库索引优化任务完成');
      return true;
    } catch (error) {
      logger.error('索引优化失败:', error);
      return false;
    }
  }

  start() {
    logger.info('数据库连接池监控已启动');

    this.checkPoolStatus();

    this.checkInterval = setInterval(() => {
      this.checkPoolStatus();
    }, this.intervalMs);

    return this;
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('数据库连接池监控已停止');
    }
  }
}

const databaseMonitor = new DatabaseMonitor();

module.exports = {
  databaseMonitor,
  DatabaseMonitor
};
