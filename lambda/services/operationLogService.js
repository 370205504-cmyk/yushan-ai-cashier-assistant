const db = require('../database/db');
const logger = require('../utils/logger');

const OPERATION_TYPES = {
  ORDER_STATUS_CHANGE: 'ORDER_STATUS_CHANGE',
  ORDER_CANCEL: 'ORDER_CANCEL',
  DISH_CREATE: 'DISH_CREATE',
  DISH_UPDATE: 'DISH_UPDATE',
  DISH_DELETE: 'DISH_DELETE',
  DISH_PRICE_CHANGE: 'DISH_PRICE_CHANGE',
  SETTINGS_CHANGE: 'SETTINGS_CHANGE',
  USER_POINTS_ADJUST: 'USER_POINTS_ADJUST',
  COUPON_CREATE: 'COUPON_CREATE',
  COUPON_DELETE: 'COUPON_DELETE',
  BACKUP_MANUAL: 'BACKUP_MANUAL',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  PRINTER_CONFIG: 'PRINTER_CONFIG',
  STOCK_ADJUST: 'STOCK_ADJUST'
};

async function logOperation(adminId, operation, detail, ip = '0.0.0.0') {
  try {
    const sanitizedDetail = typeof detail === 'object' ? JSON.stringify(detail) : String(detail || '');
    await db.query(
      'INSERT INTO operation_logs (admin_id, operation, detail, ip) VALUES (?, ?, ?, ?)',
      [adminId, operation, sanitizedDetail, ip]
    );
    logger.info('管理员操作', { adminId, operation, ip });
  } catch (error) {
    logger.error('记录操作日志失败', { error: error.message, adminId, operation });
  }
}

async function getOperationLogs(options = {}) {
  const { adminId, operation, startDate, endDate, page = 1, pageSize = 50 } = options;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let sql = 'SELECT * FROM operation_logs WHERE 1=1';
  const params = [];

  if (adminId) {
    sql += ' AND admin_id = ?';
    params.push(adminId);
  }
  if (operation) {
    sql += ' AND operation = ?';
    params.push(operation);
  }
  if (startDate) {
    sql += ' AND created_at >= ?';
    params.push(startDate);
  }
  if (endDate) {
    sql += ' AND created_at <= ?';
    params.push(endDate);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), offset);

  return await db.query(sql, params);
}

async function getAdminStats(adminId) {
  const [today, week, month] = await Promise.all([
    db.query(`
      SELECT COUNT(*) as count 
      FROM operation_logs 
      WHERE admin_id = ? 
      AND DATE(created_at) = CURDATE()`,
    [adminId]),
    db.query(`
      SELECT COUNT(*) as count 
      FROM operation_logs 
      WHERE admin_id = ? 
      AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
    [adminId]),
    db.query(`
      SELECT operation, COUNT(*) as count 
      FROM operation_logs 
      WHERE admin_id = ?
      GROUP BY operation
      ORDER BY count DESC
      LIMIT 10`,
    [adminId])
  ]);

  return {
    todayOperations: today[0]?.count || 0,
    weekOperations: week[0]?.count || 0,
    topOperations: month
  };
}

module.exports = {
  logOperation,
  getOperationLogs,
  getAdminStats,
  OPERATION_TYPES
};
