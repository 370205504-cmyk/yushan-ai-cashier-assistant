const db = require('../database/db');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.File({ filename: 'logs/payment-config.log' })]
});

class PaymentConfigService {
  async getConfigs(storeId = null) {
    try {
      let query = 'SELECT * FROM payment_configs WHERE is_active = 1';
      const params = [];

      if (storeId) {
        query += ' AND store_id = ?';
        params.push(storeId);
      } else {
        query += ' AND store_id IS NULL';
      }

      const configs = await db.query(query, params);
      return { success: true, configs: configs.map(c => ({ ...c, app_secret: undefined, mch_key: undefined })) };
    } catch (error) {
      logger.error('获取支付配置失败:', error);
      throw error;
    }
  }

  async getWechatConfig(storeId = null) {
    try {
      const result = await this.getConfigs(storeId);
      if (!result.success) return result;

      const wechat = result.configs.find(c => c.config_type === 'wechat');
      return { success: true, config: wechat || null };
    } catch (error) {
      logger.error('获取微信配置失败:', error);
      throw error;
    }
  }

  async getAlipayConfig(storeId = null) {
    try {
      const result = await this.getConfigs(storeId);
      if (!result.success) return result;

      const alipay = result.configs.find(c => c.config_type === 'alipay');
      return { success: true, config: alipay || null };
    } catch (error) {
      logger.error('获取支付宝配置失败:', error);
      throw error;
    }
  }

  async createConfig(data) {
    try {
      const result = await db.query(
        `INSERT INTO payment_configs (store_id, config_type, app_id, app_secret, mch_id, mch_key, cert_path, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.store_id || null,
          data.config_type,
          data.app_id,
          data.app_secret,
          data.mch_id,
          data.mch_key,
          data.cert_path || null,
          data.is_active !== undefined ? data.is_active : 1
        ]
      );

      logger.info(`创建${data.config_type}支付配置成功`);
      return { success: true, configId: result.insertId };
    } catch (error) {
      logger.error('创建支付配置失败:', error);
      throw error;
    }
  }

  async updateConfig(id, data) {
    try {
      const fields = [];
      const values = [];

      if (data.app_id !== undefined) {
        fields.push('app_id = ?');
        values.push(data.app_id);
      }
      if (data.app_secret !== undefined) {
        fields.push('app_secret = ?');
        values.push(data.app_secret);
      }
      if (data.mch_id !== undefined) {
        fields.push('mch_id = ?');
        values.push(data.mch_id);
      }
      if (data.mch_key !== undefined) {
        fields.push('mch_key = ?');
        values.push(data.mch_key);
      }
      if (data.cert_path !== undefined) {
        fields.push('cert_path = ?');
        values.push(data.cert_path);
      }
      if (data.is_active !== undefined) {
        fields.push('is_active = ?');
        values.push(data.is_active);
      }

      if (fields.length === 0) {
        return { success: false, message: '没有可更新的字段' };
      }

      values.push(id);
      await db.query(`UPDATE payment_configs SET ${fields.join(', ')} WHERE id = ?`, values);

      logger.info(`更新支付配置成功: ${id}`);
      return { success: true };
    } catch (error) {
      logger.error('更新支付配置失败:', error);
      throw error;
    }
  }

  async deleteConfig(id) {
    try {
      await db.query('DELETE FROM payment_configs WHERE id = ?', [id]);
      logger.info(`删除支付配置成功: ${id}`);
      return { success: true };
    } catch (error) {
      logger.error('删除支付配置失败:', error);
      throw error;
    }
  }
}

module.exports = new PaymentConfigService();
