const db = require('../database/db');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.File({ filename: 'logs/queue.log' })]
});

class QueueService {
  constructor() {
    this.tableTypeMap = {
      'small': { name: '小桌', minPeople: 1, maxPeople: 3 },
      'medium': { name: '中桌', minPeople: 4, maxPeople: 6 },
      'large': { name: '大桌', minPeople: 7, maxPeople: 10 },
      '包间': { name: '包间', minPeople: 1, maxPeople: 20 }
    };
  }

  async takeQueue(storeId, tableType, people, userId = null) {
    try {
      const store = await this.getStoreInfo(storeId);
      if (!store) {
        return { success: false, message: '门店不存在' };
      }

      const typeInfo = this.tableTypeMap[tableType];
      if (!typeInfo) {
        return { success: false, message: '无效的桌型' };
      }

      if (people < typeInfo.minPeople || people > typeInfo.maxPeople) {
        return {
          success: false,
          message: `${typeInfo.name}适合${typeInfo.minPeople}-${typeInfo.maxPeople}人，您输入了${people}人`
        };
      }

      const queueNo = `A${String(Math.floor(Math.random() * 900) + 100)}`;
      const queueId = `QUEUE${Date.now()}${uuidv4().slice(0, 6).toUpperCase()}`;

      const [currentQueue] = await db.query(
        `SELECT COUNT(*) as count FROM queues
         WHERE store_id = ? AND table_type = ? AND status IN ('waiting', 'called')
         AND created_at > DATE_SUB(NOW(), INTERVAL 4 HOUR)`,
        [storeId, tableType]
      );

      const waitCount = currentQueue.count;

      await db.query(
        `INSERT INTO queues (queue_id, store_id, user_id, table_type, people, status, queue_no, wait_count, estimated_time)
         VALUES (?, ?, ?, ?, ?, 'waiting', ?, ?, ?)`,
        [queueId, storeId, userId, tableType, people, queueNo, waitCount + 1, (waitCount + 1) * 10]
      );

      logger.info(`排队取号成功: ${queueId}`);

      return {
        success: true,
        message: '取号成功',
        data: {
          queueId,
          queueNo,
          storeName: store.name,
          tableType: typeInfo.name,
          people,
          waitCount: waitCount + 1,
          estimatedTime: (waitCount + 1) * 10,
          status: 'waiting'
        }
      };
    } catch (error) {
      logger.error('排队取号失败:', error);
      throw error;
    }
  }

  async queryQueue(queueId) {
    try {
      const queues = await db.query(
        `SELECT q.*, s.name as store_name, s.address as store_address, s.phone as store_phone
         FROM queues q
         JOIN stores s ON q.store_id = s.id
         WHERE q.queue_id = ?`,
        [queueId]
      );

      if (queues.length === 0) {
        return { success: false, message: '排队记录不存在' };
      }

      const queue = queues[0];

      const [calledQueues] = await db.query(
        `SELECT COUNT(*) as count FROM queues
         WHERE store_id = ? AND table_type = ? AND status = 'called'
         AND updated_at > (SELECT updated_at FROM queues WHERE queue_id = ?)`,
        [queue.store_id, queue.table_type, queueId]
      );

      const currentWait = queue.wait_count + calledQueues.count;

      const typeInfo = this.tableTypeMap[queue.table_type] || { name: queue.table_type };

      return {
        success: true,
        data: {
          queueId: queue.queue_id,
          queueNo: queue.queue_no,
          storeName: queue.store_name,
          storeAddress: queue.store_address,
          storePhone: queue.store_phone,
          tableType: typeInfo.name,
          people: queue.people,
          status: queue.status,
          currentWait,
          estimatedTime: currentWait * 10,
          createdAt: queue.created_at,
          note: queue.note
        }
      };
    } catch (error) {
      logger.error('查询排队失败:', error);
      throw error;
    }
  }

  async cancelQueue(queueId) {
    try {
      const queues = await db.query(
        'SELECT * FROM queues WHERE queue_id = ? AND status = \'waiting\'',
        [queueId]
      );

      if (queues.length === 0) {
        return { success: false, message: '排队记录不存在或已过时' };
      }

      await db.query(
        'UPDATE queues SET status = \'cancelled\', cancelled_at = NOW() WHERE queue_id = ?',
        [queueId]
      );

      logger.info(`排队取消: ${queueId}`);
      return { success: true, message: '排队已取消' };
    } catch (error) {
      logger.error('取消排队失败:', error);
      throw error;
    }
  }

  async callNext(storeId, tableType) {
    try {
      const [nextQueue] = await db.query(
        `SELECT * FROM queues
         WHERE store_id = ? AND table_type = ? AND status = 'waiting'
         ORDER BY created_at ASC LIMIT 1`,
        [storeId, tableType]
      );

      if (!nextQueue) {
        return { success: false, message: '当前无等待队列' };
      }

      await db.query(
        'UPDATE queues SET status = \'called\', called_at = NOW() WHERE queue_id = ?',
        [nextQueue.queue_id]
      );

      logger.info(`叫号: ${nextQueue.queue_id} -> ${nextQueue.queue_no}`);

      return {
        success: true,
        data: {
          queueId: nextQueue.queue_id,
          queueNo: nextQueue.queue_no,
          tableType: this.tableTypeMap[nextQueue.table_type]?.name || nextQueue.table_type,
          people: nextQueue.people
        }
      };
    } catch (error) {
      logger.error('叫号失败:', error);
      throw error;
    }
  }

  async getWaitingList(storeId) {
    try {
      const queues = await db.query(
        `SELECT * FROM queues
         WHERE store_id = ? AND status IN ('waiting', 'called')
         AND created_at > DATE_SUB(NOW(), INTERVAL 4 HOUR)
         ORDER BY FIELD(status, 'called', 'waiting'), created_at ASC`,
        [storeId]
      );

      return {
        success: true,
        data: {
          waiting: queues.filter(q => q.status === 'waiting'),
          called: queues.filter(q => q.status === 'called'),
          total: queues.length
        }
      };
    } catch (error) {
      logger.error('获取等待列表失败:', error);
      throw error;
    }
  }

  async getStoreInfo(storeId) {
    const stores = await db.query(
      'SELECT * FROM stores WHERE id = ? OR store_code = ?',
      [storeId, storeId]
    );
    return stores.length > 0 ? stores[0] : null;
  }

  async meituanCallback(data) {
    try {
      logger.info('美团排队回调:', data);

      const { action, params } = data;

      switch (action) {
        case 'queue_take':
          return await this.takeQueue(
            params.store_id,
            params.table_type,
            params.people,
            params.user_id
          );
        case 'queue_query':
          return await this.queryQueue(params.queue_id);
        case 'queue_cancel':
          return await this.cancelQueue(params.queue_id);
        default:
          return { success: false, message: '未知操作' };
      }
    } catch (error) {
      logger.error('美团回调处理失败:', error);
      return { success: false, message: '处理失败' };
    }
  }
}

module.exports = new QueueService();
