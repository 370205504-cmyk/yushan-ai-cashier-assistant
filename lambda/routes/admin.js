const express = require('express');
const { body, query } = require('express-validator');
const db = require('../database/db');
const { requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/security');
const { handleUpload } = require('../middleware/upload');
const notificationService = require('../services/notificationService');
const stockService = require('../services/stockService');

const router = express.Router();

router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [
      todayStats,
      orderStats,
      dishStats,
      stockAlerts,
      recentOrders
    ] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*) as total_orders,
          SUM(CASE WHEN payment_status = 'paid' THEN final_amount ELSE 0 END) as revenue,
          COUNT(DISTINCT user_id) as customers
        FROM orders
        WHERE DATE(created_at) = ?`, [today]),
      db.query(`
        SELECT status, COUNT(*) as count
        FROM orders
        WHERE DATE(created_at) = ?
        GROUP BY status`, [today]),
      db.query(`
        SELECT di.dish_name, SUM(di.quantity) as total
        FROM order_items di
        JOIN orders o ON di.order_id = o.id
        WHERE DATE(o.created_at) = ?
        GROUP BY di.dish_name
        ORDER BY total DESC
        LIMIT 5`, [today]),
      stockService.checkLowStock(),
      db.query(`
        SELECT o.*, u.nickname, u.phone
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE DATE(o.created_at) = ?
        ORDER BY o.created_at DESC
        LIMIT 20`, [today])
    ]);

    res.json({
      success: true,
      data: {
        today: {
          orders: todayStats[0].total_orders || 0,
          revenue: todayStats[0].revenue || 0,
          customers: todayStats[0].customers || 0
        },
        orderStatus: orderStats,
        topDishes: dishStats,
        stockAlerts: stockAlerts.items,
        recentOrders
      }
    });
  } catch (error) {
    console.error('获取仪表盘数据失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/orders', requireAdmin, async (req, res) => {
  try {
    const { status, page = 1, pageSize = 20, date } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let sql = `
      SELECT o.*, u.nickname, u.phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE 1=1`;
    const params = [];

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    if (date) {
      sql += ' AND DATE(o.created_at) = ?';
      params.push(date);
    }

    sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), offset);

    const orders = await db.query(sql, params);

    for (const order of orders) {
      const items = await db.query(
        'SELECT * FROM order_items WHERE order_id = ?',
        [order.id]
      );
      order.items = items;
    }

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/orders/:orderNo/status', requireAdmin, async (req, res) => {
  try {
    const { orderNo } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: '无效的订单状态' });
    }

    await db.query('UPDATE orders SET status = ?, updated_at = NOW() WHERE order_no = ?', [status, orderNo]);

    if (['confirmed', 'preparing', 'ready', 'completed'].includes(status)) {
      const orders = await db.query('SELECT * FROM orders WHERE order_no = ?', [orderNo]);
      if (orders.length > 0) {
        await notificationService.notifyOrderStatusChange(orders[0], status);
      }
    }

    res.json({ success: true, message: '订单状态已更新' });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/orders/:orderNo/print', requireAdmin, async (req, res) => {
  try {
    const printerService = require('../services/printerService');
    const result = await printerService.printOrder(req.params.orderNo);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: '打印失败' });
  }
});

router.get('/dishes', requireAdmin, async (req, res) => {
  try {
    const { category, available, page = 1, pageSize = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let sql = 'SELECT * FROM dishes WHERE 1=1';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (available !== undefined) {
      sql += ' AND is_available = ?';
      params.push(available === 'true' ? 1 : 0);
    }

    sql += ' ORDER BY sort_order ASC, id ASC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), offset);

    const dishes = await db.query(sql, params);
    res.json({ success: true, dishes });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/dishes', requireAdmin, handleUpload, async (req, res) => {
  try {
    const result = await db.query(
      `INSERT INTO dishes (name, name_en, category, price, original_price, description, image,
        stock, stock_warning, ingredients, allergens, spicy_level, is_recommended, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.body.name, req.body.name_en, req.body.category, req.body.price,
        req.body.original_price, req.body.description, req.filePath || req.body.image,
        req.body.stock ?? -1, req.body.stock_warning ?? 10,
        req.body.ingredients, req.body.allergens, req.body.spicy_level ?? 0,
        req.body.is_recommended ? 1 : 0, req.body.sort_order ?? 0
      ]
    );

    res.status(201).json({ success: true, dishId: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/dishes/:id', requireAdmin, handleUpload, async (req, res) => {
  try {
    const { id } = req.params;
    const fields = ['name', 'name_en', 'category', 'price', 'original_price', 'description',
      'stock', 'stock_warning', 'ingredients', 'allergens', 'spicy_level',
      'is_recommended', 'is_available', 'sort_order'];

    const updates = [];
    const values = [];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }

    if (req.filePath) {
      updates.push('image = ?');
      values.push(req.filePath);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: '没有可更新的字段' });
    }

    values.push(id);
    await db.query(`UPDATE dishes SET ${updates.join(', ')} WHERE id = ?`, values);

    res.json({ success: true, message: '菜品已更新' });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/dishes/:id', requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM dishes WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: '菜品已删除' });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/stock/warnings', requireAdmin, async (req, res) => {
  try {
    const result = await stockService.checkLowStock();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/stock/:dishId', requireAdmin, async (req, res) => {
  try {
    const { quantity, reason } = req.body;
    const result = await stockService.updateStock(
      parseInt(req.params.dishId),
      quantity,
      req.userId,
      reason
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/queues', requireAdmin, async (req, res) => {
  try {
    const { storeId } = req.query;
    const store = storeId || 1;

    const queues = await db.query(
      `SELECT * FROM queues
       WHERE store_id = ? AND status IN ('waiting', 'called')
       AND created_at > DATE_SUB(NOW(), INTERVAL 4 HOUR)
       ORDER BY FIELD(status, 'called', 'waiting'), created_at ASC`,
      [store]
    );

    res.json({ success: true, queues });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/queues/:queueId/call', requireAdmin, async (req, res) => {
  try {
    const queueService = require('../services/queueService');
    const result = await queueService.callNext(req.params.storeId || 1, req.body.tableType || 'small');
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/logs', requireAdmin, async (req, res) => {
  try {
    const { type, page = 1, pageSize = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    const logsDir = require('path').join(__dirname, '../logs');
    const fs = require('fs');

    const logFiles = ['access.log', 'error.log', 'payment.log', 'order.log', 'notification.log'];
    const logs = [];

    for (const file of logFiles) {
      const filePath = require('path').join(logsDir, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(l => l.trim());
        logs.push(...lines.slice(-100).map(l => ({ type: file.replace('.log', ''), content: l })));
      }
    }

    logs.sort((a, b) => new Date(b.content.split('"')[1]) - new Date(a.content.split('"')[1]));

    res.json({
      success: true,
      logs: logs.slice(offset, offset + parseInt(pageSize)),
      total: logs.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/stats/compare', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [thisWeek, lastWeekData] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*) as orders,
          SUM(final_amount) as revenue
        FROM orders
        WHERE payment_status = 'paid'
          AND created_at BETWEEN ? AND ?`, [startDate || lastWeek.toISOString().split('T')[0], endDate || today.toISOString().split('T')[0]]),
      db.query(`
        SELECT
          COUNT(*) as orders,
          SUM(final_amount) as revenue
        FROM orders
        WHERE payment_status = 'paid'
          AND created_at BETWEEN ? AND ?`, [
        new Date(lastWeek.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        lastWeek.toISOString().split('T')[0]
      ])
    ]);

    res.json({
      success: true,
      comparison: {
        thisWeek: thisWeek[0],
        lastWeek: lastWeekData[0],
        growth: {
          orders: thisWeek[0].orders - lastWeekData[0].orders,
          revenue: thisWeek[0].revenue - lastWeekData[0].revenue
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/settings', requireAdmin, async (req, res) => {
  try {
    const settings = await db.query('SELECT * FROM system_settings');
    const result = {};
    settings.forEach(s => {
      result[s.setting_key] = s.setting_value;
    });
    res.json({ success: true, settings: result });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/settings', requireAdmin, async (req, res) => {
  try {
    const settings = req.body;

    await db.transaction(async (connection) => {
      for (const [key, value] of Object.entries(settings)) {
        await connection.query(
          `INSERT INTO system_settings (setting_key, setting_value)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE setting_value = ?`,
          [key, value, value]
        );
      }
    });

    res.json({ success: true, message: '设置已更新' });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
