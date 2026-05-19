const express = require('express');
const db = require('../database/db');
const { requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/security');
const { body } = require('express-validator');
const winston = require('winston');
const os = require('os');

const router = express.Router();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: 'logs/monitor.log' }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' })
  ]
});

router.get('/system',
  requireAdmin,
  async (req, res) => {
    try {
      const cpuLoad = os.loadavg();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      const systemInfo = {
        platform: os.platform(),
        nodeVersion: process.version,
        uptime: process.uptime(),
        cpu: {
          load: cpuLoad,
          cores: os.cpus().length
        },
        memory: {
          total: Math.round(totalMem / 1024 / 1024 / 1024 * 100) / 100,
          used: Math.round(usedMem / 1024 / 1024 / 1024 * 100) / 100,
          free: Math.round(freeMem / 1024 / 1024 / 1024 * 100) / 100,
          usage: Math.round(usedMem / totalMem * 100)
        }
      };

      res.json({ success: true, data: systemInfo });
    } catch (error) {
      res.status(500).json({ success: false, message: '获取系统信息失败' });
    }
  }
);

router.get('/database',
  requireAdmin,
  async (req, res) => {
    try {
      const startTime = Date.now();
      await db.query('SELECT 1');
      const queryTime = Date.now() - startTime;

      const [tables] = await db.pool.query(`
        SELECT 
          table_name as name,
          table_rows as rows,
          data_length as dataSize,
          index_length as indexSize,
          engine
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
        ORDER BY table_rows DESC
      `);

      res.json({
        success: true,
        data: {
          status: 'connected',
          queryTime: `${queryTime}ms`,
          tables: tables.slice(0, 20)
        }
      });
    } catch (error) {
      res.json({
        success: true,
        data: {
          status: 'disconnected',
          error: error.message
        }
      });
    }
  }
);

router.get('/orders/summary',
  requireAdmin,
  async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      const [todayStats] = await db.query(`
        SELECT 
          COUNT(*) as totalOrders,
          SUM(CASE WHEN payment_status = 'paid' THEN final_amount ELSE 0 END) as revenue,
          COUNT(DISTINCT user_id) as customers,
          SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paidOrders
        FROM orders
        WHERE DATE(created_at) = ?
      `, [today]);

      const [yesterdayStats] = await db.query(`
        SELECT 
          COUNT(*) as totalOrders,
          SUM(CASE WHEN payment_status = 'paid' THEN final_amount ELSE 0 END) as revenue
        FROM orders
        WHERE DATE(created_at) = ?
      `, [yesterday]);

      const [statusStats] = await db.query(`
        SELECT status, COUNT(*) as count
        FROM orders
        WHERE DATE(created_at) = ?
        GROUP BY status
      `, [today]);

      const todayRevenue = todayStats[0].revenue || 0;
      const yesterdayRevenue = yesterdayStats[0].revenue || 0;
      const revenueGrowth = yesterdayRevenue > 0
        ? Math.round((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100)
        : 0;

      res.json({
        success: true,
        data: {
          today: {
            orders: todayStats[0].totalOrders || 0,
            revenue: todayRevenue,
            customers: todayStats[0].customers || 0,
            paidOrders: todayStats[0].paidOrders || 0
          },
          revenueGrowth,
          orderStatus: statusStats
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: '获取订单统计失败' });
    }
  }
);

router.get('/alerts',
  requireAdmin,
  async (req, res) => {
    try {
      const alerts = [];

      const [lowStock] = await db.query(`
        SELECT id, name, stock
        FROM dishes
        WHERE stock > 0 AND stock <= stock_warning
        LIMIT 10
      `);

      if (lowStock.length > 0) {
        alerts.push({
          type: 'warning',
          category: 'stock',
          title: '库存预警',
          message: `${lowStock.length}个菜品库存不足`,
          data: lowStock
        });
      }

      const [pendingOrders] = await db.query(`
        SELECT COUNT(*) as count
        FROM orders
        WHERE status IN ('pending', 'confirmed') 
        AND created_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)
      `);

      if (pendingOrders[0].count > 5) {
        alerts.push({
          type: 'danger',
          category: 'orders',
          title: '订单积压',
          message: `${pendingOrders[0].count}个订单超过30分钟未处理`,
          count: pendingOrders[0].count
        });
      }

      const [unpaidOrders] = await db.query(`
        SELECT COUNT(*) as count
        FROM orders
        WHERE payment_status = 'unpaid'
        AND status != 'cancelled'
        AND created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)
      `);

      if (unpaidOrders[0].count > 10) {
        alerts.push({
          type: 'info',
          category: 'payment',
          title: '待支付订单',
          message: `${unpaidOrders[0].count}个订单超过1小时未支付`,
          count: unpaidOrders[0].count
        });
      }

      res.json({ success: true, alerts });
    } catch (error) {
      res.status(500).json({ success: false, message: '获取告警信息失败' });
    }
  }
);

router.post('/backup',
  requireAdmin,
  async (req, res) => {
    try {
      const backupService = require('../database/backup');
      const result = await backupService.backupDatabase();

      logger.info('管理员手动备份', { adminId: req.userId });

      res.json(result);
    } catch (error) {
      logger.error('手动备份失败', { error: error.message });
      res.status(500).json({ success: false, message: '备份失败' });
    }
  }
);

router.get('/logs',
  requireAdmin,
  async (req, res) => {
    try {
      const { type = 'all', page = 1, pageSize = 50 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      const fs = require('fs');
      const path = require('path');

      const logsDir = path.join(__dirname, '../../logs');
      const logFiles = {
        access: 'access.log',
        error: 'error.log',
        order: 'orders.log',
        payment: 'payment.log',
        wechat: 'wechat.log'
      };

      const logs = [];

      if (type === 'all' || type === 'access') {
        const accessPath = path.join(logsDir, logFiles.access);
        if (fs.existsSync(accessPath)) {
          const content = fs.readFileSync(accessPath, 'utf8');
          const lines = content.split('\n').filter(l => l.trim()).slice(-200);
          lines.forEach(l => logs.push({ type: 'access', content: l }));
        }
      }

      if (type === 'all' || type === 'error') {
        const errorPath = path.join(logsDir, logFiles.error);
        if (fs.existsSync(errorPath)) {
          const content = fs.readFileSync(errorPath, 'utf8');
          const lines = content.split('\n').filter(l => l.trim()).slice(-100);
          lines.forEach(l => logs.push({ type: 'error', content: l }));
        }
      }

      logs.sort((a, b) => {
        try {
          const timeA = JSON.parse(a.content)?.timestamp || '';
          const timeB = JSON.parse(b.content)?.timestamp || '';
          return timeB.localeCompare(timeA);
        } catch {
          return 0;
        }
      });

      const total = logs.length;
      const pagedLogs = logs.slice(offset, offset + parseInt(pageSize));

      res.json({
        success: true,
        logs: pagedLogs,
        pagination: { total, page: parseInt(page), pageSize: parseInt(pageSize) }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: '获取日志失败' });
    }
  }
);

module.exports = router;
