#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class SQLiteAdapter {
  constructor(dbPath = null) {
    this.dbPath = dbPath || path.join(__dirname, '..', 'data', 'cashier.db');
    this.db = null;
  }

  connect() {
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');

    console.log(`📦 SQLite数据库连接成功: ${this.dbPath}`);
    return this;
  }

  close() {
    if (this.db) {
      this.db.close();
      console.log('📦 SQLite数据库连接已关闭');
    }
  }

  // ============ 菜品相关 ============

  getCategories() {
    return this.db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
  }

  getDishes(categoryId = null) {
    if (categoryId) {
      return this.db.prepare(
        'SELECT d.*, c.name as category_name FROM dishes d ' +
        'LEFT JOIN categories c ON d.category_id = c.id ' +
        'WHERE d.category_id = ? AND d.is_available = 1 ORDER BY d.id'
      ).all(categoryId);
    }
    return this.db.prepare(
      'SELECT d.*, c.name as category_name FROM dishes d ' +
      'LEFT JOIN categories c ON d.category_id = c.id ' +
      'WHERE d.is_available = 1 ORDER BY c.sort_order, d.id'
    ).all();
  }

  getRecommendedDishes() {
    return this.db.prepare(
      'SELECT d.*, c.name as category_name FROM dishes d ' +
      'LEFT JOIN categories c ON d.category_id = c.id ' +
      'WHERE d.is_available = 1 AND d.is_recommended = 1 LIMIT 5'
    ).all();
  }

  getDishById(id) {
    return this.db.prepare(
      'SELECT d.*, c.name as category_name FROM dishes d ' +
      'LEFT JOIN categories c ON d.category_id = c.id ' +
      'WHERE d.id = ?'
    ).get(id);
  }

  // ============ 桌台相关 ============

  getTables() {
    return this.db.prepare('SELECT * FROM tables ORDER BY id').all();
  }

  getTableById(id) {
    return this.db.prepare('SELECT * FROM tables WHERE id = ?').get(id);
  }

  updateTableStatus(id, status) {
    return this.db.prepare('UPDATE tables SET status = ? WHERE id = ?').run(status, id);
  }

  // ============ 订单相关 ============

  createOrder(orderData) {
    const { table_id, customer_count = 1, remarks = '' } = orderData;

    const orderNumber = `ORD${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const result = this.db.prepare(
      'INSERT INTO orders (table_id, order_number, customer_count, remarks, status) VALUES (?, ?, ?, ?, ?)'
    ).run(table_id, orderNumber, customer_count, remarks, 'pending');

    return {
      id: result.lastInsertRowid,
      order_number: orderNumber
    };
  }

  addOrderItem(orderId, item) {
    const { dish_id, dish_name, price, quantity, remarks = '' } = item;
    const subtotal = price * quantity;

    const result = this.db.prepare(
      'INSERT INTO order_items (order_id, dish_id, dish_name, price, quantity, subtotal, remarks) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(orderId, dish_id, dish_name, price, quantity, subtotal, remarks);

    return result.lastInsertRowid;
  }

  calculateOrderTotal(orderId) {
    const total = this.db.prepare(
      'SELECT SUM(subtotal) as total FROM order_items WHERE order_id = ?'
    ).get(orderId);

    this.db.prepare(
      'UPDATE orders SET total_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(total.total || 0, orderId);

    return total.total || 0;
  }

  getOrderById(id) {
    const order = this.db.prepare(
      'SELECT o.*, t.name as table_name FROM orders o ' +
      'LEFT JOIN tables t ON o.table_id = t.id ' +
      'WHERE o.id = ?'
    ).get(id);

    if (order) {
      order.items = this.db.prepare(
        'SELECT * FROM order_items WHERE order_id = ?'
      ).all(id);
    }

    return order;
  }

  getOrderByNumber(orderNumber) {
    const order = this.db.prepare(
      'SELECT o.*, t.name as table_name FROM orders o ' +
      'LEFT JOIN tables t ON o.table_id = t.id ' +
      'WHERE o.order_number = ?'
    ).get(orderNumber);

    if (order) {
      order.items = this.db.prepare(
        'SELECT * FROM order_items WHERE order_id = ?'
      ).all(order.id);
    }

    return order;
  }

  getOrders(status = null, limit = 50) {
    let sql = 'SELECT o.*, t.name as table_name FROM orders o ' +
              'LEFT JOIN tables t ON o.table_id = t.id ';

    if (status) {
      sql += ' WHERE o.status = ?';
      return this.db.prepare(sql + ' ORDER BY o.created_at DESC LIMIT ?').all(status, limit);
    }

    return this.db.prepare(sql + ' ORDER BY o.created_at DESC LIMIT ?').all(limit);
  }

  updateOrderStatus(id, status) {
    return this.db.prepare(
      'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(status, id);
  }

  // ============ 店铺配置相关 ============

  getShopConfig(key) {
    const config = this.db.prepare(
      'SELECT value FROM shop_config WHERE key = ?'
    ).get(key);
    return config ? config.value : null;
  }

  getAllShopConfig() {
    const configs = this.db.prepare('SELECT * FROM shop_config').all();
    const result = {};
    configs.forEach(c => {
      result[c.key] = c.value;
    });
    return result;
  }

  updateShopConfig(key, value) {
    return this.db.prepare(
      'INSERT OR REPLACE INTO shop_config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
    ).run(key, value);
  }

  // ============ 统计相关 ============

  getDailyStats(date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];

    const stats = this.db.prepare(`
      SELECT
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(customer_count), 0) as customer_count
      FROM orders
      WHERE DATE(created_at) = ? AND status != 'cancelled'
    `).get(targetDate);

    const avgOrderValue = stats.order_count > 0
      ? (stats.total_revenue / stats.order_count).toFixed(2)
      : 0;

    return {
      ...stats,
      avg_order_value: parseFloat(avgOrderValue),
      date: targetDate
    };
  }

  getTopDishes(limit = 10, date = null) {
    let sql = `
      SELECT
        oi.dish_name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.subtotal) as total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'cancelled'
    `;

    if (date) {
      sql += ` AND DATE(o.created_at) = '${date}'`;
    }

    sql += ` GROUP BY oi.dish_name ORDER BY total_quantity DESC LIMIT ?`;

    return this.db.prepare(sql).all(limit);
  }

  // ============ 会员相关 ============

  getMemberByPhone(phone) {
    return this.db.prepare('SELECT * FROM members WHERE phone = ?').get(phone);
  }

  createMember(memberData) {
    const { phone, name = '' } = memberData;
    const result = this.db.prepare(
      'INSERT INTO members (phone, name) VALUES (?, ?)'
    ).run(phone, name);
    return result.lastInsertRowid;
  }

  updateMemberPoints(phone, points) {
    return this.db.prepare(
      'UPDATE members SET points = points + ? WHERE phone = ?'
    ).run(points, phone);
  }
}

module.exports = SQLiteAdapter;
