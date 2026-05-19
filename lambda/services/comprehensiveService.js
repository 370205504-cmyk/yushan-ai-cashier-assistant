const db = require('../database/db');
const logger = require('../utils/logger');

/**
 * 综合服务 - 处理外卖配送、发票、打印机配置、多门店切换等功能
 */
class ComprehensiveService {
  /**
   * 获取充电宝服务信息
   */
  async getPowerBankInfo(storeId = null) {
    try {
      const id = storeId || await this.getDefaultStoreId();
      const results = await db.query(
        'SELECT setting_key, setting_value FROM store_settings WHERE store_id = ? AND setting_key LIKE ?',
        [id, 'power_bank%']
      );
      
      const settings = {};
      results.forEach(row => {
        settings[row.setting_key] = row.setting_value;
      });
      
      return {
        success: true,
        data: {
          available: settings.power_bank_available === '1',
          brand: settings.power_bank_brand || '未提供',
          description: settings.power_bank_available === '1' 
            ? '本店提供充电宝服务，欢迎使用' 
            : '暂未提供充电宝服务'
        }
      };
    } catch (error) {
      logger.error('获取充电宝信息失败', { error: error.message, storeId });
      return { success: false, message: '获取信息失败' };
    }
  }

  /**
   * 获取宠物政策信息
   */
  async getPetPolicy(storeId = null) {
    try {
      const id = storeId || await this.getDefaultStoreId();
      const result = await db.query(
        'SELECT setting_value FROM store_settings WHERE store_id = ? AND setting_key = ?',
        [id, 'pet_friendly']
      );
      
      const petFriendly = result.length > 0 ? result[0].setting_value === '1' : false;
      
      return {
        success: true,
        data: {
          pet_friendly: petFriendly,
          policy: petFriendly 
            ? '欢迎携带宠物入内，请保持环境卫生' 
            : '暂不允许宠物入内，敬请谅解'
        }
      };
    } catch (error) {
      logger.error('获取宠物政策失败', { error: error.message, storeId });
      return { success: false, message: '获取信息失败' };
    }
  }

  /**
   * 获取儿童服务信息
   */
  async getKidsService(storeId = null) {
    try {
      const id = storeId || await this.getDefaultStoreId();
      const results = await db.query(
        'SELECT setting_key, setting_value FROM store_settings WHERE store_id = ? AND setting_key LIKE ?',
        [id, 'kids%']
      );
      
      const settings = {};
      results.forEach(row => {
        settings[row.setting_key] = row.setting_value;
      });
      
      return {
        success: true,
        data: {
          available: settings.kids_friendly === '1',
          has_high_chair: settings.kids_high_chair === '1',
          description: settings.kids_friendly === '1' 
            ? '本店提供儿童友好服务，有儿童座椅供使用' 
            : '暂未提供儿童专属服务'
        }
      };
    } catch (error) {
      logger.error('获取儿童服务信息失败', { error: error.message, storeId });
      return { success: false, message: '获取信息失败' };
    }
  }

  /**
   * 申请开具发票
   */
  async requestInvoice(invoiceData) {
    try {
      const { order_no, invoice_type, invoice_title, tax_number, company_address, company_phone, bank_name, bank_account, email, phone, remark, user_id } = invoiceData;
      
      // 检查订单是否存在并已支付
      const orders = await db.query('SELECT * FROM orders WHERE order_no = ?', [order_no]);
      if (orders.length === 0) {
        return { success: false, message: '订单不存在' };
      }
      
      const order = orders[0];
      if (order.payment_status !== 'paid') {
        return { success: false, message: '订单未支付，暂无法开具发票' };
      }
      
      // 检查是否已申请过发票
      const existingInvoices = await db.query('SELECT * FROM invoices WHERE order_no = ?', [order_no]);
      if (existingInvoices.length > 0) {
        return { success: false, message: '该订单已申请过发票' };
      }
      
      // 创建发票记录
      const result = await db.query(
        'INSERT INTO invoices (order_no, store_id, user_id, invoice_type, invoice_title, tax_number, company_address, company_phone, bank_name, bank_account, amount, email, phone, remark, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [order_no, order.store_id, user_id || null, invoice_type, invoice_title, tax_number || null, company_address || null, company_phone || null, bank_name || null, bank_account || null, order.final_amount, email || null, phone || null, remark || null, 'pending']
      );
      
      logger.logPayment(order_no, '发票申请提交', { invoiceId: result.insertId });
      
      return {
        success: true,
        message: '发票申请已提交，我们将尽快处理',
        data: {
          invoice_id: result.insertId,
          order_no: order_no
        }
      };
    } catch (error) {
      logger.error('申请发票失败', { error: error.message, orderNo: invoiceData.order_no });
      return { success: false, message: '申请发票失败' };
    }
  }

  /**
   * 查询发票状态
   */
  async getInvoiceStatus(orderNo, invoiceId = null) {
    try {
      let query = 'SELECT * FROM invoices WHERE order_no = ?';
      let params = [orderNo];
      
      if (invoiceId) {
        query += ' AND id = ?';
        params.push(invoiceId);
      }
      
      const invoices = await db.query(query, params);
      
      return {
        success: true,
        data: invoices
      };
    } catch (error) {
      logger.error('查询发票状态失败', { error: error.message, orderNo, invoiceId });
      return { success: false, message: '查询失败' };
    }
  }

  /**
   * 创建外卖配送订单
   */
  async createDeliveryOrder(deliveryData) {
    try {
      const { order_no, store_id, delivery_address, contact_name, contact_phone, delivery_fee, tips = 0, notes = '' } = deliveryData;
      
      const store = await db.query('SELECT * FROM stores WHERE id = ?', [store_id]);
      if (store.length === 0) {
        return { success: false, message: '门店不存在' };
      }
      
      if (store[0].can_deliver !== 1) {
        return { success: false, message: '该门店暂不支持外卖配送' };
      }
      
      const result = await db.query(
        'INSERT INTO delivery_orders (order_no, store_id, delivery_address, contact_name, contact_phone, delivery_fee, tips, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [order_no, store_id, delivery_address, contact_name, contact_phone, delivery_fee, tips, notes, 'pending']
      );
      
      logger.logPayment(order_no, '外卖配送订单创建', { deliveryId: result.insertId });
      
      return {
        success: true,
        message: '配送订单创建成功',
        data: {
          delivery_id: result.insertId,
          order_no: order_no,
          status: 'pending',
          estimated_arrival: this.calculateEstimatedArrival(store[0])
        }
      };
    } catch (error) {
      logger.error('创建配送订单失败', { error: error.message, orderNo: deliveryData.order_no });
      return { success: false, message: '创建配送订单失败' };
    }
  }

  /**
   * 跟踪配送状态
   */
  async trackDelivery(orderNo) {
    try {
      const deliveries = await db.query('SELECT * FROM delivery_orders WHERE order_no = ? ORDER BY created_at DESC LIMIT 1', [orderNo]);
      
      if (deliveries.length === 0) {
        return { success: false, message: '配送订单不存在' };
      }
      
      return {
        success: true,
        data: deliveries[0]
      };
    } catch (error) {
      logger.error('跟踪配送失败', { error: error.message, orderNo });
      return { success: false, message: '查询配送状态失败' };
    }
  }

  /**
   * 更新配送状态
   */
  async updateDeliveryStatus(orderNo, status, riderName = null, riderPhone = null) {
    try {
      const updateData = { status };
      if (riderName) updateData.rider_name = riderName;
      if (riderPhone) updateData.rider_phone = riderPhone;
      
      if (status === 'delivered') {
        updateData.actual_arrival = new Date();
      }
      
      const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(updateData), orderNo];
      
      await db.query(`UPDATE delivery_orders SET ${setClause} WHERE order_no = ?`, values);
      
      logger.logPayment(orderNo, '配送状态更新', { newStatus: status });
      
      return {
        success: true,
        message: '配送状态已更新'
      };
    } catch (error) {
      logger.error('更新配送状态失败', { error: error.message, orderNo, status });
      return { success: false, message: '更新配送状态失败' };
    }
  }

  /**
   * 获取打印机配置
   */
  async getPrinterConfig(storeId = null) {
    try {
      const id = storeId || await this.getDefaultStoreId();
      const printers = await db.query('SELECT * FROM printer_configs WHERE store_id = ?', [id]);
      
      return {
        success: true,
        data: printers
      };
    } catch (error) {
      logger.error('获取打印机配置失败', { error: error.message, storeId });
      return { success: false, message: '获取配置失败' };
    }
  }

  /**
   * 切换当前门店
   */
  async switchStore(userId, storeId) {
    try {
      const store = await db.query('SELECT * FROM stores WHERE id = ? AND status = ?', [storeId, 'active']);
      
      if (store.length === 0) {
        return { success: false, message: '门店不存在或不可用' };
      }
      
      await db.query(
        'INSERT INTO user_store_preferences (user_id, current_store_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE current_store_id = ?',
        [userId, storeId, storeId]
      );
      
      logger.logOperation(userId, '切换门店', { from: 'previous', to: storeId });
      
      return {
        success: true,
        message: '已切换到门店',
        data: store[0]
      };
    } catch (error) {
      logger.error('切换门店失败', { error: error.message, userId, storeId });
      return { success: false, message: '切换门店失败' };
    }
  }

  /**
   * 获取当前选择的门店
   */
  async getCurrentStore(userId) {
    try {
      const preference = await db.query('SELECT current_store_id FROM user_store_preferences WHERE user_id = ?', [userId]);
      
      let storeId = null;
      if (preference.length > 0 && preference[0].current_store_id) {
        storeId = preference[0].current_store_id;
      } else {
        storeId = await this.getDefaultStoreId();
      }
      
      const store = await db.query('SELECT * FROM stores WHERE id = ?', [storeId]);
      
      return {
        success: true,
        data: store.length > 0 ? store[0] : null
      };
    } catch (error) {
      logger.error('获取当前门店失败', { error: error.message, userId });
      return { success: false, message: '获取失败' };
    }
  }

  /**
   * 导出数据
   */
  async exportData(dataType, startDate, endDate, format, storeId = null) {
    try {
      let data = [];
      
      switch (dataType) {
        case 'orders':
          let orderQuery = 'SELECT * FROM orders WHERE created_at BETWEEN ? AND ?';
          let orderParams = [startDate, endDate];
          if (storeId) {
            orderQuery += ' AND store_id = ?';
            orderParams.push(storeId);
          }
          data = await db.query(orderQuery, orderParams);
          break;
          
        case 'dishes':
          let dishQuery = 'SELECT * FROM dishes';
          let dishParams = [];
          if (storeId) {
            dishQuery += ' WHERE store_id = ?';
            dishParams.push(storeId);
          }
          data = await db.query(dishQuery, dishParams);
          break;
          
        case 'members':
          let memberQuery = 'SELECT * FROM users WHERE created_at BETWEEN ? AND ?';
          let memberParams = [startDate, endDate];
          data = await db.query(memberQuery, memberParams);
          break;
          
        case 'revenue':
          let revenueQuery = `
            SELECT 
              DATE(created_at) as date,
              SUM(final_amount) as total_revenue,
              COUNT(*) as order_count
            FROM orders 
            WHERE created_at BETWEEN ? AND ? AND payment_status = 'paid'
          `;
          let revenueParams = [startDate, endDate];
          if (storeId) {
            revenueQuery += ' AND store_id = ?';
            revenueParams.push(storeId);
          }
          revenueQuery += ' GROUP BY DATE(created_at)';
          data = await db.query(revenueQuery, revenueParams);
          break;
          
        default:
          return { success: false, message: '不支持的数据类型' };
      }
      
      return {
        success: true,
        data: data,
        format: format,
        total_count: data.length
      };
    } catch (error) {
      logger.error('导出数据失败', { error: error.message, dataType, startDate, endDate });
      return { success: false, message: '导出数据失败' };
    }
  }

  /**
   * 获取默认门店ID
   */
  async getDefaultStoreId() {
    try {
      const result = await db.query('SELECT id FROM stores WHERE is_default = 1 LIMIT 1');
      return result.length > 0 ? result[0].id : 1;
    } catch {
      return 1;
    }
  }

  /**
   * 计算预计送达时间
   */
  calculateEstimatedArrival(store) {
    const now = new Date();
    const deliveryTime = store.delivery_range ? store.delivery_range * 10 : 30; // 默认30分钟
    now.setMinutes(now.getMinutes() + deliveryTime);
    return now.toISOString();
  }
}

module.exports = new ComprehensiveService();
