const db = require('../database/db');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.File({ filename: 'logs/analytics.log' })]
});

class AnalyticsService {
  async getDashboardStats(date = null) {
    const today = date || new Date().toISOString().split('T')[0];
    const startOfDay = `${today} 00:00:00`;
    const endOfDay = `${today} 23:59:59`;

    try {
      const [
        todayOrders,
        todayRevenue,
        todayCustomers,
        pendingOrders,
        lowStockItems,
        recentOrders
      ] = await Promise.all([
        db.query('SELECT COUNT(*) as count FROM orders WHERE created_at BETWEEN ? AND ?', [startOfDay, endOfDay]),
        db.query('SELECT SUM(final_amount) as total FROM orders WHERE payment_status = ? AND created_at BETWEEN ? AND ?', ['paid', startOfDay, endOfDay]),
        db.query('SELECT COUNT(DISTINCT user_id) as count FROM orders WHERE user_id IS NOT NULL AND created_at BETWEEN ? AND ?', [startOfDay, endOfDay]),
        db.query('SELECT COUNT(*) as count FROM orders WHERE status IN (?, ?)', ['pending', 'confirmed']),
        db.query('SELECT name, stock FROM dishes WHERE stock > 0 AND stock <= stock_warning'),
        db.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 10')
      ]);

      return {
        success: true,
        stats: {
          todayOrders: todayOrders[0].count || 0,
          todayRevenue: todayRevenue[0].total || 0,
          todayCustomers: todayCustomers[0].count || 0,
          pendingOrders: pendingOrders[0].count || 0,
          lowStockAlerts: lowStockItems.length,
          lowStockItems
        },
        recentOrders
      };
    } catch (error) {
      logger.error('获取统计数据失败:', error);
      throw error;
    }
  }

  async getRevenueStats(startDate, endDate, groupBy = 'day') {
    try {
      let dateFormat, groupFormat;
      switch (groupBy) {
        case 'hour':
          dateFormat = '%Y-%m-%d %H:00';
          groupFormat = '%Y-%m-%d %H';
          break;
        case 'week':
          dateFormat = '%Y-W%u';
          groupFormat = '%Y-W%u';
          break;
        case 'month':
          dateFormat = '%Y-%m';
          groupFormat = '%Y-%m';
          break;
        default:
          dateFormat = '%Y-%m-%d';
          groupFormat = '%Y-%m-%d';
      }

      const sql = `
        SELECT
          DATE_FORMAT(created_at, '${groupFormat}') as period,
          COUNT(*) as order_count,
          SUM(total_amount) as gross_revenue,
          SUM(discount_amount) as discount,
          SUM(final_amount) as net_revenue,
          AVG(final_amount) as avg_order_value
        FROM orders
        WHERE payment_status = 'paid'
          AND created_at BETWEEN ? AND ?
        GROUP BY DATE_FORMAT(created_at, '${groupFormat}')
        ORDER BY period ASC
      `;

      const results = await db.query(sql, [`${startDate} 00:00:00`, `${endDate} 23:59:59`]);
      return { success: true, stats: results };
    } catch (error) {
      logger.error('获取营收统计失败:', error);
      throw error;
    }
  }

  async getDishStats(startDate, endDate, limit = 20) {
    try {
      const sql = `
        SELECT
          di.dish_id,
          di.dish_name,
          COUNT(*) as order_count,
          SUM(di.quantity) as total_quantity,
          SUM(di.subtotal) as total_revenue,
          AVG(di.unit_price) as avg_price
        FROM order_items di
        JOIN orders o ON di.order_id = o.id
        WHERE o.payment_status = 'paid'
          AND o.created_at BETWEEN ? AND ?
        GROUP BY di.dish_id, di.dish_name
        ORDER BY total_quantity DESC
        LIMIT ?
      `;

      const results = await db.query(sql, [`${startDate} 00:00:00`, `${endDate} 23:59:59`, limit]);
      return { success: true, dishes: results };
    } catch (error) {
      logger.error('获取菜品统计失败:', error);
      throw error;
    }
  }

  async getCustomerStats(startDate, endDate) {
    try {
      const sql = `
        SELECT
          u.id,
          u.nickname,
          u.phone,
          COUNT(o.id) as order_count,
          SUM(o.final_amount) as total_spent,
          AVG(o.final_amount) as avg_order_value,
          MAX(o.created_at) as last_order_date
        FROM users u
        JOIN orders o ON u.id = o.user_id
        WHERE o.payment_status = 'paid'
          AND o.created_at BETWEEN ? AND ?
        GROUP BY u.id, u.nickname, u.phone
        ORDER BY total_spent DESC
        LIMIT 50
      `;

      const results = await db.query(sql, [`${startDate} 00:00:00`, `${endDate} 23:59:59`]);

      const totalCustomers = await db.query(
        'SELECT COUNT(DISTINCT user_id) as count FROM orders WHERE user_id IS NOT NULL AND created_at BETWEEN ? AND ?',
        [`${startDate} 00:00:00`, `${endDate} 23:59:59`]
      );

      const newCustomers = await db.query(
        'SELECT COUNT(*) as count FROM users WHERE created_at BETWEEN ? AND ?',
        [`${startDate} 00:00:00`, `${endDate} 23:59:59`]
      );

      return {
        success: true,
        customers: results,
        summary: {
          totalCustomers: totalCustomers[0].count || 0,
          newCustomers: newCustomers[0].count || 0
        }
      };
    } catch (error) {
      logger.error('获取客户统计失败:', error);
      throw error;
    }
  }

  async getHourlyStats(date) {
    try {
      const sql = `
        SELECT
          HOUR(created_at) as hour,
          COUNT(*) as order_count,
          SUM(final_amount) as revenue
        FROM orders
        WHERE DATE(created_at) = ?
          AND payment_status = 'paid'
        GROUP BY HOUR(created_at)
        ORDER BY hour ASC
      `;

      const results = await db.query(sql, [date]);

      const hourlyData = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        order_count: 0,
        revenue: 0
      }));

      results.forEach(r => {
        hourlyData[r.hour] = r;
      });

      return { success: true, hourlyStats: hourlyData };
    } catch (error) {
      logger.error('获取时段统计失败:', error);
      throw error;
    }
  }

  async getCategoryStats(startDate, endDate) {
    try {
      const sql = `
        SELECT
          d.category,
          COUNT(DISTINCT d.id) as dish_count,
          COUNT(oi.id) as order_count,
          SUM(oi.quantity) as total_quantity,
          SUM(oi.subtotal) as total_revenue
        FROM dishes d
        LEFT JOIN order_items oi ON d.id = oi.dish_id
        LEFT JOIN orders o ON oi.order_id = o.id AND o.payment_status = 'paid'
          AND o.created_at BETWEEN ? AND ?
        GROUP BY d.category
        ORDER BY total_revenue DESC
      `;

      const results = await db.query(sql, [`${startDate} 00:00:00`, `${endDate} 23:59:59`]);

      const totalRevenue = results.reduce((sum, r) => sum + (r.total_revenue || 0), 0);

      const categoryStats = results.map(r => ({
        ...r,
        percentage: totalRevenue > 0 ? ((r.total_revenue || 0) / totalRevenue * 100).toFixed(1) : 0
      }));

      return { success: true, categories: categoryStats };
    } catch (error) {
      logger.error('获取分类统计失败:', error);
      throw error;
    }
  }

  async getRetentionRate(startDate, endDate) {
    try {
      const periodDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));

      const sql = `
        SELECT
          COUNT(DISTINCT user_id) as active_users
        FROM orders
        WHERE created_at BETWEEN ? AND ?
      `;

      const activeUsers = await db.query(sql, [`${startDate} 00:00:00`, `${endDate} 23:59:59`]);

      const returningUsers = await db.query(`
        SELECT COUNT(*) as count FROM (
          SELECT user_id
          FROM orders
          WHERE user_id IS NOT NULL
          AND created_at BETWEEN ? AND ?
          GROUP BY user_id
          HAVING COUNT(*) > 1
        ) t
      `, [`${startDate} 00:00:00`, `${endDate} 23:59:59`]);

      const total = activeUsers[0].active_users || 0;
      const returning = returningUsers[0].count || 0;

      return {
        success: true,
        retention: {
          activeUsers: total,
          returningUsers: returning,
          newUsers: total - returning,
          retentionRate: total > 0 ? ((returning / total) * 100).toFixed(1) : 0
        }
      };
    } catch (error) {
      logger.error('获取留存率失败:', error);
      throw error;
    }
  }

  async exportReport(startDate, endDate, format = 'json') {
    try {
      const [revenue, dishes, customers] = await Promise.all([
        this.getRevenueStats(startDate, endDate, 'day'),
        this.getDishStats(startDate, endDate, 50),
        this.getCustomerStats(startDate, endDate)
      ]);

      const report = {
        generatedAt: new Date().toISOString(),
        period: { startDate, endDate },
        revenue: revenue.stats,
        topDishes: dishes.dishes,
        topCustomers: customers.customers,
        summary: {
          totalRevenue: revenue.stats.reduce((s, r) => s + (r.net_revenue || 0), 0),
          totalOrders: revenue.stats.reduce((s, r) => s + (r.order_count || 0), 0),
          avgOrderValue: revenue.stats.length > 0
            ? revenue.stats.reduce((s, r) => s + (r.avg_order_value || 0), 0) / revenue.stats.length
            : 0
        }
      };

      logger.info(`报表导出: ${startDate} ~ ${endDate}`);
      return { success: true, report };
    } catch (error) {
      logger.error('导出报表失败:', error);
      throw error;
    }
  }
}

module.exports = new AnalyticsService();
