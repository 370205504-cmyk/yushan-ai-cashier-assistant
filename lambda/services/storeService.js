const db = require('../database/db');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.File({ filename: 'logs/store.log' })]
});

class StoreService {
  async getStores(storeId = null) {
    try {
      if (storeId) {
        const stores = await db.query('SELECT * FROM stores WHERE id = ? AND status = ?', [storeId, 'active']);
        if (stores.length === 0) {
          return { success: false, message: '门店不存在' };
        }
        return { success: true, store: stores[0] };
      }

      const stores = await db.query('SELECT * FROM stores WHERE status = ? ORDER BY sort_order ASC', ['active']);
      return { success: true, stores };
    } catch (error) {
      logger.error('获取门店列表失败:', error.message);
      return { success: false, message: '门店数据不可用' };
    }
  }

  async getDefaultStore() {
    try {
      const stores = await db.query('SELECT * FROM stores WHERE is_default = 1 AND status = ? LIMIT 1', ['active']);
      if (stores.length === 0) {
        const fallback = await db.query('SELECT * FROM stores WHERE status = ? ORDER BY sort_order ASC LIMIT 1', ['active']);
        if (fallback.length === 0) {
          return { success: false, message: '没有可用门店' };
        }
        return { success: true, store: fallback[0] };
      }
      return { success: true, store: stores[0] };
    } catch (error) {
      logger.error('获取默认门店失败:', error.message);
      return { success: false, message: '门店数据不可用' };
    }
  }

  async getStoreInfo(storeId = null) {
    try {
      let store;
      if (!storeId) {
        const result = await this.getDefaultStore();
        if (!result.success) return result;
        store = result.store;
      } else {
        const result = await this.getStores(storeId);
        if (!result.success) return result;
        store = result.store;
      }

      const settings = await this.getStoreSettings(store.id);
      return {
        success: true,
        store,
        settings: settings.success ? settings.settings : {}
      };
    } catch (error) {
      logger.error('获取门店信息失败:', error.message);
      return { success: false, message: '门店数据不可用' };
    }
  }

  async getBusinessHours(storeId = null) {
    try {
      const result = await this.getStoreInfo(storeId);
      if (!result.success) return result;
      return {
        success: true,
        business_hours: result.store.business_hours,
        store_name: result.store.name
      };
    } catch (error) {
      logger.error('获取营业时间失败:', error.message);
      return { success: false, message: '营业时间数据不可用' };
    }
  }

  async getWifiInfo(storeId = null) {
    try {
      const result = await this.getStoreInfo(storeId);
      if (!result.success) return result;
      return {
        success: true,
        has_wifi: Boolean(result.store.has_wifi),
        wifi_name: result.store.wifi_name,
        wifi_password: result.store.wifi_password,
        store_name: result.store.name
      };
    } catch (error) {
      logger.error('获取WiFi信息失败:', error.message);
      return { success: false, message: 'WiFi数据不可用' };
    }
  }

  async getParkingInfo(storeId = null) {
    try {
      const result = await this.getStoreInfo(storeId);
      if (!result.success) return result;
      return {
        success: true,
        has_parking: Boolean(result.store.has_parking),
        parking_info: result.store.parking_info,
        store_name: result.store.name
      };
    } catch (error) {
      logger.error('获取停车信息失败:', error.message);
      return { success: false, message: '停车信息不可用' };
    }
  }

  async getContactInfo(storeId = null) {
    try {
      const result = await this.getStoreInfo(storeId);
      if (!result.success) return result;
      return {
        success: true,
        address: result.store.address,
        phone: result.store.phone,
        store_name: result.store.name,
        location: {
          lat: result.store.lat,
          lng: result.store.lng
        }
      };
    } catch (error) {
      logger.error('获取联系信息失败:', error.message);
      return { success: false, message: '联系信息不可用' };
    }
  }

  async getAddress(storeId = null) {
    try {
      const result = await this.getContactInfo(storeId);
      if (!result.success) return result;
      return {
        success: true,
        address: result.address,
        store_name: result.store_name
      };
    } catch (error) {
      logger.error('获取地址失败:', error.message);
      return { success: false, message: '地址信息不可用' };
    }
  }

  async getPhone(storeId = null) {
    try {
      const result = await this.getContactInfo(storeId);
      if (!result.success) return result;
      return {
        success: true,
        phone: result.phone,
        store_name: result.store_name
      };
    } catch (error) {
      logger.error('获取电话失败:', error.message);
      return { success: false, message: '电话信息不可用' };
    }
  }

  async getStoreServices(storeId = null) {
    try {
      const result = await this.getStoreInfo(storeId);
      if (!result.success) return result;

      const services = {
        wifi: Boolean(result.store.has_wifi),
        parking: Boolean(result.store.has_parking),
        delivery: Boolean(result.store.can_deliver),
        reservation: Boolean(result.store.can_reserve),
        self_order: Boolean(result.store.has_self_order),
        power_bank: result.settings.power_bank_available === '1',
        kids_friendly: result.settings.kids_friendly === '1',
        pet_friendly: result.settings.pet_friendly === '1',
        invoice_available: result.settings.invoice_available === '1'
      };

      return {
        success: true,
        services,
        store_name: result.store.name,
        features: result.store.features
      };
    } catch (error) {
      logger.error('获取门店服务失败:', error.message);
      return { success: false, message: '门店服务数据不可用' };
    }
  }

  async getAnnouncements(storeId = null) {
    try {
      let query = 'SELECT * FROM announcements WHERE is_active = 1';
      const params = [];

      if (storeId) {
        query += ' AND (store_id = ? OR store_id IS NULL)';
        params.push(storeId);
      } else {
        query += ' AND store_id IS NULL';
      }

      query += ' ORDER BY sort_order ASC, created_at DESC';

      const announcements = await db.query(query, params);
      return { success: true, announcements };
    } catch (error) {
      logger.error('获取公告失败:', error.message);
      return { success: false, message: '公告数据不可用' };
    }
  }

  async getReservationInfo(storeId = null) {
    try {
      const result = await this.getStoreInfo(storeId);
      if (!result.success) return result;

      return {
        success: true,
        can_reserve: Boolean(result.store.can_reserve),
        store_name: result.store.name,
        table_count: result.store.table_count,
        minimum_order: parseFloat(result.settings.minimum_order || 0)
      };
    } catch (error) {
      logger.error('获取预订信息失败:', error.message);
      return { success: false, message: '预订信息不可用' };
    }
  }

  async getTakeoutInfo(storeId = null) {
    try {
      const result = await this.getStoreInfo(storeId);
      if (!result.success) return result;

      return {
        success: true,
        can_deliver: Boolean(result.store.can_deliver),
        takeout_available: result.settings.takeout_available === '1',
        takeout_fee: parseFloat(result.settings.takeout_fee || 0),
        delivery_range: result.store.delivery_range,
        minimum_order: parseFloat(result.settings.minimum_order || 0),
        delivery_fee: parseFloat(result.settings.delivery_fee || 0),
        store_name: result.store.name
      };
    } catch (error) {
      logger.error('获取外卖信息失败:', error);
      throw error;
    }
  }

  async createStore(data) {
    try {
      const result = await db.query(
        `INSERT INTO stores (name, name_en, address, phone, business_hours, lat, lng, image, description, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.name, data.name_en, data.address, data.phone, data.business_hours,
          data.lat, data.lng, data.image, data.description, data.status || 'active'
        ]
      );

      logger.info(`门店创建: ${data.name}`);
      return { success: true, storeId: result.insertId };
    } catch (error) {
      logger.error('创建门店失败:', error);
      throw error;
    }
  }

  async updateStore(storeId, data) {
    try {
      const fields = ['name', 'name_en', 'address', 'phone', 'business_hours', 'lat', 'lng', 'image', 'description', 'status'];
      const updates = [];
      const values = [];

      for (const field of fields) {
        if (data[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(data[field]);
        }
      }

      if (updates.length === 0) {
        return { success: false, message: '没有可更新的字段' };
      }

      values.push(storeId);
      await db.query(`UPDATE stores SET ${updates.join(', ')} WHERE id = ?`, values);

      logger.info(`门店更新: ${storeId}`);
      return { success: true };
    } catch (error) {
      logger.error('更新门店失败:', error);
      throw error;
    }
  }

  async getNearbyStores(lat, lng, radius = 10) {
    try {
      const stores = await db.query(
        `SELECT *,
          (6371 * acos(cos(radians(?)) * cos(radians(lat))
           * cos(radians(lng) - radians(?)) + sin(radians(?))
           * sin(radians(lat)))) AS distance
         FROM stores
         WHERE status = 'active'
         HAVING distance <= ?
         ORDER BY distance ASC`
        , [lat, lng, lat, radius]
      );

      return { success: true, stores };
    } catch (error) {
      logger.error('获取附近门店失败:', error);
      throw error;
    }
  }

  async getStoreSettings(storeId) {
    try {
      const settings = await db.query('SELECT * FROM store_settings WHERE store_id = ?', [storeId]);
      if (settings.length === 0) {
        return { success: true, settings: {} };
      }

      const result = {};
      settings.forEach(s => {
        result[s.setting_key] = s.setting_value;
      });

      return { success: true, settings: result };
    } catch (error) {
      logger.error('获取门店设置失败:', error);
      throw error;
    }
  }

  async updateStoreSettings(storeId, settings) {
    try {
      await db.transaction(async (connection) => {
        for (const [key, value] of Object.entries(settings)) {
          await connection.query(
            `INSERT INTO store_settings (store_id, setting_key, setting_value)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE setting_value = ?`,
            [storeId, key, value, value]
          );
        }
      });

      logger.info(`门店设置更新: ${storeId}`);
      return { success: true };
    } catch (error) {
      logger.error('更新门店设置失败:', error);
      throw error;
    }
  }

  async getStoreStats(storeId, startDate, endDate) {
    try {
      const stats = await db.query(`
        SELECT
          COUNT(DISTINCT o.id) as total_orders,
          SUM(o.final_amount) as total_revenue,
          COUNT(DISTINCT o.user_id) as total_customers
        FROM orders o
        WHERE o.store_id = ?
          AND o.created_at BETWEEN ? AND ?
          AND o.payment_status = 'paid'
      `, [storeId, `${startDate} 00:00:00`, `${endDate} 23:59:59`]);

      const hourlyStats = await db.query(`
        SELECT HOUR(created_at) as hour, COUNT(*) as orders
        FROM orders
        WHERE store_id = ?
          AND DATE(created_at) = ?
        GROUP BY HOUR(created_at)
      `, [storeId, new Date().toISOString().split('T')[0]]);

      return {
        success: true,
        stats: stats[0],
        hourlyStats
      };
    } catch (error) {
      logger.error('获取门店统计失败:', error);
      throw error;
    }
  }

  async setDefaultStore(storeId) {
    try {
      await db.transaction(async (connection) => {
        await connection.query('UPDATE stores SET is_default = 0');
        await connection.query('UPDATE stores SET is_default = 1 WHERE id = ?', [storeId]);
      });

      logger.info(`设置默认门店: ${storeId}`);
      return { success: true };
    } catch (error) {
      logger.error('设置默认门店失败:', error);
      throw error;
    }
  }
}

module.exports = new StoreService();
