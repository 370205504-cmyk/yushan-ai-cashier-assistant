const express = require('express');
const db = require('../database/db');
const { requireAdmin } = require('../middleware/auth');
const roleService = require('../services/roleService');
const { logOperation, OPERATION_TYPES } = require('../services/operationLogService');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/export/orders', requireAdmin, async (req, res) => {
  try {
    const adminRole = await roleService.getAdminRole(req.userId);
    if (adminRole !== 'super_admin') {
      return res.status(403).json({ success: false, message: '只有超级管理员可以导出订单数据' });
    }

    const { startDate, endDate } = req.query;

    let sql = 'SELECT * FROM orders';
    const params = [];

    if (startDate) {
      sql += ' WHERE created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += startDate ? ' AND' : ' WHERE';
      sql += ' created_at <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY created_at DESC';

    const orders = await db.query(sql, params);

    const data = orders.map(order => ({
      orderNo: order.order_no,
      userId: order.user_id,
      type: order.type,
      status: order.status,
      paymentStatus: order.payment_status,
      totalAmount: order.total_amount,
      discountAmount: order.discount_amount,
      finalAmount: order.final_amount,
      tableNo: order.table_no,
      guestCount: order.guest_count,
      remarks: order.remarks,
      createdAt: order.created_at,
      updatedAt: order.updated_at
    }));

    await logOperation(req.userId, OPERATION_TYPES.DATA_EXPORT, {
      type: 'orders',
      count: data.length,
      startDate,
      endDate
    }, req.ip);

    logger.info(`订单数据导出: ${data.length}条, 操作员: ${req.userId}`);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=orders_${Date.now()}.json`);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('订单导出失败:', error);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

router.get('/export/users', requireAdmin, async (req, res) => {
  try {
    const adminRole = await roleService.getAdminRole(req.userId);
    if (adminRole !== 'super_admin') {
      return res.status(403).json({ success: false, message: '只有超级管理员可以导出用户数据' });
    }

    const users = await db.query('SELECT id, user_id, nickname, role, points, balance, total_spent, created_at FROM users');

    await logOperation(req.userId, OPERATION_TYPES.DATA_EXPORT, {
      type: 'users',
      count: users.length
    }, req.ip);

    logger.info(`用户数据导出: ${users.length}条, 操作员: ${req.userId}`);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=users_${Date.now()}.json`);
    res.json({ success: true, data: users });
  } catch (error) {
    logger.error('用户导出失败:', error);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

router.get('/export/sales', requireAdmin, async (req, res) => {
  try {
    const adminRole = await roleService.getAdminRole(req.userId);
    if (!['super_admin', 'manager'].includes(adminRole)) {
      return res.status(403).json({ success: false, message: '权限不足' });
    }

    const { startDate, endDate } = req.query;

    let sql = `SELECT DATE(o.created_at) as date, COUNT(*) as order_count, 
               SUM(o.final_amount) as total_sales, SUM(o.discount_amount) as total_discount
               FROM orders o WHERE o.status = 'completed'`;
    const params = [];

    if (startDate) {
      sql += ' AND o.created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND o.created_at <= ?';
      params.push(endDate);
    }

    sql += ' GROUP BY DATE(o.created_at) ORDER BY date DESC';

    const sales = await db.query(sql, params);

    await logOperation(req.userId, OPERATION_TYPES.DATA_EXPORT, {
      type: 'sales',
      count: sales.length,
      startDate,
      endDate
    }, req.ip);

    logger.info(`销售数据导出: ${sales.length}条, 操作员: ${req.userId}`);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=sales_${Date.now()}.json`);
    res.json({ success: true, data: sales });
  } catch (error) {
    logger.error('销售数据导出失败:', error);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

module.exports = router;
