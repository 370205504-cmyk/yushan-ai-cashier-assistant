const express = require('express');
const db = require('../database/db');
const { v4: uuidv4 } = require('uuid');
const stockService = require('../services/stockService');
const memberService = require('../services/memberService');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { body } = require('express-validator');
const { validate } = require('../middleware/security');
const inputValidator = require('../services/inputValidator');
const logger = require('../utils/logger');
const { logOperation, OPERATION_TYPES } = require('../services/operationLogService');
const crypto = require('crypto');

const router = express.Router();

const PRICE_TAMPERING_THRESHOLD = 0.01;
const MAX_PRICE_DEVIATION_RATIO = 0.5;

router.post('/create',
  optionalAuth,
  [
    body('items').isArray({ min: 1 }),
    body('type').isIn(['dine_in', 'takeout', 'delivery']),
    body('tableNo').optional().isLength({ max: 20 }),
    body('guestCount').optional().isInt({ min: 1 })
  ],
  validate,
  async (req, res) => {
    try {
      const { items, type, tableNo, guestCount, remarks, address, contactPhone, requestId } = req.body;
      const userId = req.userId || null;

      if (!items || items.length === 0) {
        return res.status(400).json({ success: false, message: '购物车不能为空' });
      }

      if (req.body.totalAmount !== undefined || req.body.finalAmount !== undefined) {
        return res.status(400).json({ success: false, message: '非法请求参数' });
      }

      if (remarks && remarks.length > 200) {
        return res.status(400).json({ success: false, message: '备注不能超过200字' });
      }

      const safeRequestId = requestId ? inputValidator.sanitizeString(requestId) : null;

      const orderNo = `ORD${Date.now()}${uuidv4().slice(0, 6).toUpperCase()}`;

      let totalAmount = 0;
      const orderItems = [];

      for (const item of items) {
        if (!item.dishId || !item.quantity) {
          return res.status(400).json({ success: false, message: '无效的菜品数据' });
        }
        if (item.price !== undefined) {
          return res.status(400).json({ success: false, message: '非法请求参数' });
        }

        const dishes = await db.query('SELECT * FROM dishes WHERE id = ? AND is_available = 1', [item.dishId]);
        if (dishes.length === 0) {
          return res.status(400).json({ success: false, message: `菜品不存在: ${item.dishId}` });
        }
        const dish = dishes[0];
        const quantity = parseInt(item.quantity);
        if (quantity <= 0 || quantity > 99) {
          return res.status(400).json({ success: false, message: '无效的数量' });
        }
        
        const subtotal = dish.price * quantity;
        totalAmount += subtotal;
        
        orderItems.push({
          dishId: dish.id,
          dishName: dish.name,
          quantity: quantity,
          unitPrice: dish.price,
          subtotal: subtotal,
          remarks: inputValidator ? inputValidator.validateOrderRemarks(item.remarks) : ''
        });
      }

      if (Math.abs(totalAmount - (req.body.clientTotalAmount || 0)) > PRICE_TAMPERING_THRESHOLD) {
        logger.warn(`订单价格校验: ${orderNo}, 服务端计算=${totalAmount}, 客户端提交=${req.body.clientTotalAmount || 0}`);
      }

      let discountAmount = 0;
      let couponId = null;
      let couponRecordId = null;
      if (req.body.couponId && userId) {
        const coupons = await db.query(
          `SELECT uc.id as record_id, uc.*, c.value, c.min_amount, c.max_discount, c.type
           FROM user_coupons uc JOIN coupons c ON uc.coupon_id = c.id
           WHERE uc.id = ? AND uc.user_id = ? AND uc.status = 'unused'`,
          [req.body.couponId, userId]
        );
        if (coupons.length > 0) {
          const coupon = coupons[0];
          couponRecordId = coupon.record_id;
          if (totalAmount >= coupon.min_amount) {
            couponId = coupon.id;
            if (coupon.type === 'discount') {
              discountAmount = Math.min(totalAmount * coupon.value / 100, coupon.max_discount || totalAmount);
            } else {
              discountAmount = coupon.value;
            }
          }
        }
      }

      const finalAmount = Math.max(0, totalAmount - discountAmount);
      const pointsEarned = Math.floor(finalAmount);

      await db.transaction(async (connection) => {
        if (safeRequestId) {
          const [existing] = await connection.query(
            'SELECT id, order_no, total_amount FROM orders WHERE request_id = ? FOR UPDATE',
            [safeRequestId]
          );
          if (existing.length > 0) {
            logger.info(`订单幂等返回(事务): requestId=${safeRequestId}`);
            return res.json({
              success: true,
              idempotent: true,
              message: '订单已创建',
              order: { orderNo: existing[0].order_no, totalAmount: existing[0].total_amount }
            });
          }
        }

        for (const item of orderItems) {
          const [dishStock] = await connection.query(
            'SELECT stock FROM dishes WHERE id = ? FOR UPDATE',
            [item.dishId]
          );
          if (dishStock.length > 0) {
            const currentStock = dishStock[0].stock || 999;
            if (currentStock !== 999 && currentStock < item.quantity) {
              throw new Error(`菜品《${item.dishName}》库存不足，仅剩${currentStock}份`);
            }
            if (currentStock !== 999) {
              await connection.query(
                'UPDATE dishes SET stock = stock - ? WHERE id = ?',
                [item.quantity, item.dishId]
              );
            }
          }
        }

        const [orderResult] = await connection.query(
          `INSERT INTO orders (order_no, user_id, request_id, type, total_amount, discount_amount, final_amount,
            points_earned, coupon_id, table_no, guest_count, remarks, address, contact_phone, pay_expire_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))`,
          [orderNo, userId, safeRequestId, type, totalAmount, discountAmount, finalAmount, pointsEarned,
            couponId, tableNo, guestCount || 1, remarks, address, contactPhone]
        );

        for (const item of orderItems) {
          await connection.query(
            `INSERT INTO order_items (order_id, dish_id, dish_name, quantity, unit_price, subtotal, remarks)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [orderResult.insertId, item.dishId, item.dishName, item.quantity, item.unitPrice, item.subtotal, item.remarks]
          );
        }

        if (couponRecordId) {
          await connection.query('UPDATE user_coupons SET status = ? WHERE id = ?', ['used', couponRecordId]);
        }

        await connection.query('DELETE FROM carts WHERE user_id = ?', [userId]);
      });

      logger.info(`订单创建: ${orderNo}, 金额: ${finalAmount}`);
      res.json({
        success: true,
        order: { orderNo, totalAmount, discountAmount, finalAmount, pointsEarned }
      });
    } catch (error) {
      logger.error('订单创建失败:', error);
      res.status(500).json({ success: false, message: error.message || '订单创建失败' });
    }
  }
);

router.get('/list',
  requireAuth,
  async (req, res) => {
    try {
      const { status, page = 1, pageSize = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(pageSize);

      let sql = 'SELECT * FROM orders WHERE user_id = ?';
      const params = [req.userId];

      if (status) {
        sql += ' AND status = ?';
        params.push(status);
      }

      sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(pageSize), offset);

      const orders = await db.query(sql, params);

      for (const order of orders) {
        const items = await db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
        order.items = items;
      }

      res.json({ success: true, orders });
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/:orderNo',
  optionalAuth,
  async (req, res) => {
    try {
      const orders = await db.query('SELECT * FROM orders WHERE order_no = ?', [req.params.orderNo]);
      if (orders.length === 0) {
        return res.status(404).json({ success: false, message: '订单不存在' });
      }

      const order = orders[0];
      const items = await db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      order.items = items;

      res.json({ success: true, order });
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.put('/:orderNo/cancel',
  requireAuth,
  async (req, res) => {
    try {
      const { confirmPassword } = req.body;

      if (!confirmPassword) {
        return res.status(400).json({ success: false, message: '需要验证密码才能取消订单' });
      }

      const orders = await db.query('SELECT * FROM orders WHERE order_no = ? AND user_id = ?', [req.params.orderNo, req.userId]);
      if (orders.length === 0) {
        return res.status(404).json({ success: false, message: '订单不存在' });
      }

      const order = orders[0];
      if (!['pending', 'confirmed'].includes(order.status)) {
        return res.status(400).json({ success: false, message: '订单无法取消' });
      }

      await db.transaction(async (connection) => {
        const [orderLock] = await connection.query(
          'SELECT * FROM orders WHERE order_no = ? FOR UPDATE',
          [req.params.orderNo]
        );

        await connection.query('UPDATE orders SET status = ?, updated_at = NOW() WHERE order_no = ?', ['cancelled', req.params.orderNo]);

        const items = await connection.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
        for (const item of items) {
          await connection.query('UPDATE dishes SET stock = stock + ? WHERE id = ?', [item.quantity, item.dish_id]);
        }

        if (order.payment_status === 'paid') {
          const paymentService = require('../services/paymentService');
          try {
            await paymentService.refund(req.params.orderNo, order.final_amount, '用户取消订单');
          } catch (refundError) {
            logger.error('自动退款失败:', refundError);
          }
        }
      });

      res.json({ success: true, message: '订单已取消' });
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.post('/:orderNo/confirm',
  optionalAuth,
  async (req, res) => {
    try {
      const { adminKey } = req.body;

      if (adminKey !== process.env.ADMIN_API_KEY) {
        return res.status(403).json({ success: false, message: '权限不足' });
      }

      const orders = await db.query('SELECT * FROM orders WHERE order_no = ?', [req.params.orderNo]);
      if (orders.length === 0) {
        return res.status(404).json({ success: false, message: '订单不存在' });
      }

      const order = orders[0];
      if (order.status !== 'pending') {
        return res.status(400).json({ success: false, message: '订单状态无法确认' });
      }

      await db.query('UPDATE orders SET status = ?, updated_at = NOW() WHERE order_no = ?', ['confirmed', req.params.orderNo]);

      await logOperation('system', OPERATION_TYPES.ORDER_STATUS_CHANGE, { orderNo: req.params.orderNo, from: 'pending', to: 'confirmed' }, req.ip);

      logger.info(`订单确认: ${req.params.orderNo}`);
      res.json({ success: true, message: '订单已确认' });
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.post('/print',
  optionalAuth,
  async (req, res) => {
    try {
      const { orderNo } = req.body;

      if (!orderNo) {
        return res.status(400).json({ success: false, message: '缺少订单号' });
      }

      const orders = await db.query('SELECT * FROM orders WHERE order_no = ?', [orderNo]);
      if (orders.length === 0) {
        return res.status(404).json({ success: false, message: '订单不存在' });
      }

      const order = orders[0];
      const items = await db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      order.items = items;

      // 更新订单支付状态
      await db.query('UPDATE orders SET payment_status = ?, status = ?, updated_at = NOW() WHERE order_no = ?', ['paid', 'confirmed', orderNo]);

      // 调用打印服务
      try {
        const printerService = require('../utils/printerService');
        const printer = new printerService();
        const printResult = printer.printReceipt(order);
        logger.info('订单打印', { orderNo, success: printResult.success });
      } catch (printError) {
        logger.error('打印订单失败', { orderNo, error: printError.message });
      }

      await logOperation('system', OPERATION_TYPES.ORDER_STATUS_CHANGE, { orderNo: orderNo, from: 'pending', to: 'confirmed' }, req.ip);

      res.json({ success: true, message: '订单已确认并打印', orderNo });
    } catch (error) {
      logger.error('订单打印失败', error);
      res.status(500).json({ success: false, message: error.message || '服务器错误' });
    }
  }
);

router.get('/admin/list',
  requireAuth,
  async (req, res) => {
    try {
      const { status, page = 1, pageSize = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(pageSize);

      let sql = 'SELECT * FROM orders';
      const params = [];

      if (status) {
        sql += ' WHERE status = ?';
        params.push(status);
      }

      sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(pageSize), offset);

      const orders = await db.query(sql, params);

      for (const order of orders) {
        const items = await db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
        order.items = items;
      }

      res.json({ success: true, orders });
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

module.exports = router;
