const db = require('../database/db');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.File({ filename: 'logs/delivery.log' })]
});

class DeliveryService {
  async createDelivery(orderId, address, contactPhone, contactName = '') {
    try {
      const deliveryNo = `DLV${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

      await db.query(
        `INSERT INTO deliveries (delivery_no, order_id, address, contact_phone, contact_name, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [deliveryNo, orderId, address, contactPhone, contactName]
      );

      logger.info(`配送单创建: ${deliveryNo}`);
      return { success: true, deliveryNo };
    } catch (error) {
      logger.error('创建配送单失败:', error);
      throw error;
    }
  }

  async assignDriver(deliveryNo, driverId) {
    try {
      const result = await db.query(
        'UPDATE deliveries SET driver_id = ?, status = \'assigned\', assigned_at = NOW() WHERE delivery_no = ?',
        [driverId, deliveryNo]
      );

      logger.info(`配送单分配司机: ${deliveryNo} -> ${driverId}`);
      return { success: true };
    } catch (error) {
      logger.error('分配司机失败:', error);
      throw error;
    }
  }

  async updateStatus(deliveryNo, status, location = null) {
    const statusMap = {
      'assigned': '已分配',
      'picking_up': '取餐中',
      'delivering': '配送中',
      'completed': '已完成',
      'cancelled': '已取消'
    };

    let sql = 'UPDATE deliveries SET status = ?, updated_at = NOW()';
    const params = [status];

    if (location) {
      sql += ', current_location = ?';
      params.push(JSON.stringify(location));
    }

    if (status === 'picking_up') {
      sql += ', picked_up_at = NOW()';
    } else if (status === 'completed') {
      sql += ', completed_at = NOW()';
    }

    sql += ' WHERE delivery_no = ?';
    params.push(deliveryNo);

    await db.query(sql, params);

    logger.info(`配送状态更新: ${deliveryNo} -> ${statusMap[status]}`);
    return { success: true, status: statusMap[status] };
  }

  async getDeliveryInfo(deliveryNo) {
    const deliveries = await db.query(
      `SELECT d.*, dr.name as driver_name, dr.phone as driver_phone, dr.current_location
       FROM deliveries d
       LEFT JOIN delivery_drivers dr ON d.driver_id = dr.id
       WHERE d.delivery_no = ?`,
      [deliveryNo]
    );

    if (deliveries.length === 0) {
      return { success: false, message: '配送单不存在' };
    }

    return { success: true, delivery: deliveries[0] };
  }

  async getDriverDeliveries(driverId, status = null) {
    let sql = 'SELECT * FROM deliveries WHERE driver_id = ?';
    const params = [driverId];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    const deliveries = await db.query(sql, params);
    return { success: true, deliveries };
  }

  async getNearbyOrders(lat, lng, radius = 5) {
    const orders = await db.query(
      `SELECT d.*, o.order_no, o.final_amount, o.contact_phone, o.address
       FROM deliveries d
       JOIN orders o ON d.order_id = o.id
       WHERE d.status = 'pending'
       AND (d.current_lat IS NULL OR d.current_lng IS NULL
         OR (6371 * acos(cos(radians(?)) * cos(radians(d.current_lat))
           * cos(radians(d.current_lng) - radians(?)) + sin(radians(?))
           * sin(radians(d.current_lat)))) <= ?)
       ORDER BY d.created_at ASC`,
      [lat, lng, lat, radius]
    );

    return { success: true, orders };
  }

  async updateDriverLocation(driverId, lat, lng) {
    await db.query(
      'UPDATE delivery_drivers SET current_lat = ?, current_lng = ?, updated_at = NOW() WHERE id = ?',
      [lat, lng, driverId]
    );
    return { success: true };
  }

  async calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }

  async estimateDeliveryTime(distance) {
    const avgSpeed = 25;
    const prepTime = 15;
    const deliveryMinutes = Math.ceil((distance / avgSpeed) * 60);
    return prepTime + deliveryMinutes;
  }
}

module.exports = new DeliveryService();
