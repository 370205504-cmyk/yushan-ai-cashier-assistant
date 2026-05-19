const axios = require('axios');
const crypto = require('crypto');
const db = require('../database/db');
const logger = require('../utils/logger');

const OrderStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PAID: 'paid',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled'
};

const ALLOWED_STATUS_TRANSITIONS = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.REFUNDED],
  [OrderStatus.REFUNDED]: [],
  [OrderStatus.CANCELLED]: []
};

const MAX_PAYMENT_AMOUNT = 99999.99;
const MIN_PAYMENT_AMOUNT = 0.01;

/**
 * 支付服务类
 * 负责处理微信支付和支付宝相关的支付逻辑
 */
class PaymentService {
  constructor() {
    this.wechatConfig = {
      appid: process.env.WECHAT_APPID,
      mchid: process.env.WECHAT_MCHID,
      apikey: process.env.WECHAT_APIKEY,
      notifyUrl: process.env.WECHAT_NOTIFY_URL
    };
    this.alipayConfig = {
      appid: process.env.ALIPAY_APPID,
      privateKey: process.env.ALIPAY_PRIVATE_KEY,
      publicKey: process.env.ALIPAPUBLIC_KEY,
      notifyUrl: process.env.ALIPAY_NOTIFY_URL
    };
  }

  validateAmount(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return { valid: false, message: '金额必须是数字' };
    }
    if (amount < MIN_PAYMENT_AMOUNT) {
      return { valid: false, message: `支付金额不能小于${MIN_PAYMENT_AMOUNT}元` };
    }
    if (amount > MAX_PAYMENT_AMOUNT) {
      return { valid: false, message: `支付金额不能超过${MAX_PAYMENT_AMOUNT}元` };
    }
    if (amount.toString().split('.')[1]?.length > 2) {
      return { valid: false, message: '金额最多支持两位小数' };
    }
    return { valid: true };
  }

  async validateOrderForPayment(orderNo, expectedAmount) {
    const orders = await db.query('SELECT * FROM orders WHERE order_no = ?', [orderNo]);
    if (orders.length === 0) {
      return { valid: false, message: '订单不存在' };
    }

    const order = orders[0];

    const amountValidation = this.validateAmount(order.final_amount);
    if (!amountValidation.valid) {
      return amountValidation;
    }

    if (expectedAmount !== undefined && Math.abs(order.final_amount - expectedAmount) > 0.01) {
      logger.logSecurity('PAYMENT_AMOUNT_MISMATCH', '支付金额验证失败', {
        orderNo,
        expectedAmount,
        actualAmount: order.final_amount
      });
      return { valid: false, message: '支付金额验证失败' };
    }

    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
      return { valid: false, message: '订单状态不允许支付' };
    }

    return { valid: true, order };
  }

  isValidStatusTransition(currentStatus, newStatus) {
    const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus];
    return allowed && allowed.includes(newStatus);
  }

  /**
   * 创建微信支付订单
   * @param {Object} order - 订单信息对象
   * @param {string} order.orderNo - 订单号
   * @param {number} order.finalAmount - 订单最终金额
   * @returns {Promise<Object>} 包含支付二维码或错误信息的结果
   */
  async createWechatPayOrder(order) {
    try {
      const amountValidation = this.validateAmount(order.finalAmount);
      if (!amountValidation.valid) {
        logger.logSecurity('PAYMENT_INVALID_AMOUNT', '无效的支付金额', {
          orderNo: order.orderNo,
          amount: order.finalAmount
        });
        return { success: false, message: amountValidation.message };
      }

      const orderValidation = await this.validateOrderForPayment(order.orderNo, order.finalAmount);
      if (!orderValidation.valid) {
        return { success: false, message: orderValidation.message };
      }

      logger.logPayment(order.orderNo, '开始创建微信支付订单', {
        amount: order.finalAmount
      });

      const nonceStr = crypto.randomBytes(16).toString('hex');
      const timeStamp = Math.floor(Date.now() / 1000).toString();

      const params = {
        appid: this.wechatConfig.appid,
        mchid: this.wechatConfig.mchid,
        description: `雨姗AI收银助手订单-${order.orderNo}`,
        out_trade_no: order.orderNo,
        amount: {
          total: Math.round(order.finalAmount * 100),
          currency: 'CNY'
        },
        notify_url: this.wechatConfig.notifyUrl
      };

      const { data } = await axios.post('https://api.mch.weixin.qq.com/v3/pay/transactions/native', params, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `WECHATPAY2-SHA256-RSA2048 mchid="${this.wechatConfig.mchid}"`
        }
      });

      logger.logPayment(order.orderNo, '微信支付订单创建成功', {
        tradeNo: data.transaction_id
      });

      return { success: true, codeUrl: data.code_url, tradeNo: data.transaction_id };
    } catch (error) {
      logger.logPayment(order.orderNo, '微信支付订单创建失败', {
        error: error.response?.data || error.message
      });
      return { success: false, message: '支付创建失败' };
    }
  }

  /**
   * 创建支付宝支付订单
   * @param {Object} order - 订单信息对象
   * @param {string} order.orderNo - 订单号
   * @param {number} order.finalAmount - 订单最终金额
   * @returns {Promise<Object>} 包含支付信息的结果
   */
  async createAlipayOrder(order) {
    try {
      const amountValidation = this.validateAmount(order.finalAmount);
      if (!amountValidation.valid) {
        logger.logSecurity('PAYMENT_INVALID_AMOUNT', '无效的支付金额', {
          orderNo: order.orderNo,
          amount: order.finalAmount
        });
        return { success: false, message: amountValidation.message };
      }

      const orderValidation = await this.validateOrderForPayment(order.orderNo, order.finalAmount);
      if (!orderValidation.valid) {
        return { success: false, message: orderValidation.message };
      }

      logger.logPayment(order.orderNo, '开始创建支付宝支付订单', {
        amount: order.finalAmount
      });

      const bizContent = {
        out_trade_no: order.orderNo,
        total_amount: order.finalAmount.toString(),
        subject: `雨姗AI收银助手订单-${order.orderNo}`,
        product_code: 'FAST_INSTANT_TRADE_PAY'
      };

      logger.logPayment(order.orderNo, '支付宝支付订单创建成功');
      return { success: true, tradeNo: order.orderNo };
    } catch (error) {
      logger.logPayment(order.orderNo, '支付宝支付订单创建失败', {
        error: error.message
      });
      return { success: false, message: '支付创建失败' };
    }
  }

  /**
   * 处理支付宝支付回调
   * @param {Object} data - 回调数据
   * @param {string} signature - 签名
   * @returns {Promise<Object>} 处理结果
   */
  async handleAlipayCallback(data, signature) {
    try {
      const { out_trade_no, trade_no, trade_status, total_amount } = data;

      logger.logPayment(out_trade_no, '收到支付宝支付回调', {
        tradeStatus: trade_status,
        tradeNo: trade_no
      });

      if (!signature) {
        logger.logSecurity('ALIPAY_CALLBACK_NO_SIGN', '支付宝回调缺少签名', { orderNo: out_trade_no });
        return { success: false, message: '签名验证失败' };
      }

      const isSignValid = this.verifyAlipaySign(data, signature);
      if (!isSignValid) {
        logger.logSecurity('ALIPAY_SIGN_VERIFY_FAILED', '支付宝回调签名验证失败', { orderNo: out_trade_no });
        return { success: false, message: '签名验证失败' };
      }

      const order = await db.query('SELECT * FROM orders WHERE order_no = ?', [out_trade_no]);

      if (order.length === 0) {
        logger.warn(`支付宝回调订单不存在: ${out_trade_no}`);
        return { success: false, message: '订单不存在' };
      }

      const orderInfo = order[0];

      if (!this.isValidStatusTransition(orderInfo.status, OrderStatus.PAID)) {
        logger.logSecurity('INVALID_STATUS_TRANSITION', '订单状态不允许支付', {
          orderNo: out_trade_no,
          currentStatus: orderInfo.status
        });
        return { success: false, message: '订单状态不允许支付' };
      }

      const expectedTotal = orderInfo.final_amount.toString();
      if (total_amount && Math.abs(parseFloat(total_amount) - orderInfo.final_amount) > 0.01) {
        logger.logSecurity('ALIPAY_AMOUNT_MISMATCH', '支付宝回调金额不匹配', {
          orderNo: out_trade_no,
          expected: expectedTotal,
          actual: total_amount
        });
        return { success: false, message: '金额不匹配' };
      }

      if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
        await this.updatePaymentStatusWithLock(out_trade_no, trade_no, data);
        return { success: true };
      }

      return { success: false, message: '支付未成功' };
    } catch (error) {
      logger.error('支付宝回调处理失败:', error);
      return { success: false, message: '处理失败' };
    }
  }

  verifyAlipaySign(data, signature) {
    try {
      const obj = { ...data };
      delete obj.sign;
      delete obj.sign_type;

      const sortedKeys = Object.keys(obj).sort();
      const signStr = sortedKeys.map(k => `${k}=${obj[k]}`).join('&');

      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(signStr);
      return verify.verify(this.alipayConfig.publicKey, signature, 'base64');
    } catch (error) {
      logger.error('支付宝签名验证异常:', error);
      return false;
    }
  }

  /**
   * 处理微信支付回调
   * @param {Object} req - Express 请求对象
   * @returns {Promise<Object>} 处理结果
   */
  async handleWechatCallback(req) {
    try {
      const body = req.body;
      const xmlData = typeof body === 'string' ? body : JSON.stringify(body);

      const { out_trade_no, transaction_id, trade_state, total, mch_id, sign } = body;

      logger.logPayment(out_trade_no, '收到微信支付回调', {
        tradeState: trade_state,
        transactionId: transaction_id
      });

      if (!sign) {
        logger.logSecurity('WECHAT_CALLBACK_NO_SIGN', '微信回调缺少签名', { orderNo: out_trade_no });
        return { success: false, message: '签名验证失败' };
      }

      const order = await db.query('SELECT * FROM orders WHERE order_no = ?', [out_trade_no]);

      if (order.length === 0) {
        logger.warn(`支付回调订单不存在: ${out_trade_no}`);
        return { success: false, message: '订单不存在' };
      }

      const orderInfo = order[0];

      const isSignValid = await this.verifyWechatPaySign(body, orderInfo);
      if (!isSignValid) {
        logger.logSecurity('WECHAT_SIGN_VERIFY_FAILED', '支付回调签名验证失败', { orderNo: out_trade_no });
        return { success: false, message: '签名验证失败' };
      }

      if (!this.isValidStatusTransition(orderInfo.status, OrderStatus.PAID)) {
        logger.logSecurity('INVALID_STATUS_TRANSITION', '订单状态不允许支付', {
          orderNo: out_trade_no,
          currentStatus: orderInfo.status
        });
        return { success: false, message: '订单状态不允许支付' };
      }

      const expectedTotal = Math.round(orderInfo.final_amount * 100);
      if (total !== undefined && total !== expectedTotal) {
        logger.logSecurity('WECHAT_AMOUNT_MISMATCH', '支付回调金额不匹配', {
          orderNo: out_trade_no,
          expected: expectedTotal,
          actual: total
        });
        return { success: false, message: '金额不匹配' };
      }

      if (mch_id && mch_id !== this.wechatConfig.mchid) {
        logger.logSecurity('WECHAT_MCH_ID_MISMATCH', '支付回调商户号不匹配', { orderNo: out_trade_no });
        return { success: false, message: '商户号不匹配' };
      }

      if (trade_state === 'SUCCESS') {
        await this.updatePaymentStatusWithLock(out_trade_no, transaction_id, body);
        return { success: true };
      }

      return { success: false, message: '支付未成功' };
    } catch (error) {
      logger.error('微信回调处理失败:', error);
      return { success: false, message: '处理失败' };
    }
  }

  /**
   * 验证微信支付签名
   * @param {Object} data - 回调数据
   * @param {Object} order - 订单信息
   * @returns {Promise<boolean>} 签名验证是否通过
   */
  async verifyWechatPaySign(data, order) {
    try {
      const obj = { ...data };
      const receivedSign = obj.sign;
      delete obj.sign;

      const sortedKeys = Object.keys(obj).sort();
      let signStr = sortedKeys.map(k => `${k}=${obj[k]}`).join('&');
      signStr += `&key=${this.wechatConfig.apikey}`;

      const calculatedSign = crypto.createHash('md5')
        .update(signStr, 'utf8')
        .digest('hex')
        .toUpperCase();

      return crypto.timingSafeEqual(
        Buffer.from(calculatedSign),
        Buffer.from(receivedSign || '')
      );
    } catch (error) {
      logger.error('签名验证异常:', error);
      return false;
    }
  }

  /**
   * 使用数据库锁更新支付状态（保证幂等性）
   * @param {string} orderNo - 订单号
   * @param {string} paymentNo - 第三方支付单号
   * @param {Object} callbackData - 回调数据
   * @returns {Promise<void>}
   */
  async updatePaymentStatusWithLock(orderNo, paymentNo, callbackData) {
    await db.transaction(async (connection) => {
      const [order] = await connection.query(
        'SELECT * FROM orders WHERE order_no = ? FOR UPDATE',
        [orderNo]
      );

      if (order[0].payment_status === 'paid') {
        logger.info(`订单已支付，幂等返回: ${orderNo}`);
        return;
      }

      await connection.query(
        'UPDATE orders SET payment_status = ?, payment_no = ?, status = ?, updated_at = NOW() WHERE order_no = ?',
        ['paid', paymentNo, 'confirmed', orderNo]
      );

      const { printerService } = require('../utils/printerService');
      try {
        await printerService.printOrder(order[0]);
      } catch (printError) {
        logger.error('打印失败，但订单已处理:', printError);
      }

      logger.logPayment(orderNo, '支付回调处理成功', {
        paymentNo,
        status: 'confirmed'
      });
    });
  }

  /**
   * 查询订单支付状态
   * @param {string} orderNo - 订单号
   * @returns {Promise<Object>} 包含支付状态的结果
   */
  async queryPaymentStatus(orderNo) {
    try {
      const orders = await db.query('SELECT * FROM orders WHERE order_no = ?', [orderNo]);
      if (orders.length === 0) {
        return { success: false, message: '订单不存在' };
      }
      return { success: true, paymentStatus: orders[0].payment_status, paymentNo: orders[0].payment_no };
    } catch (error) {
      logger.error('查询支付状态失败:', error);
      throw error;
    }
  }

  /**
   * 申请退款
   * @param {string} orderNo - 订单号
   * @param {number} amount - 退款金额
   * @param {string} reason - 退款原因
   * @returns {Promise<Object>} 退款结果
   */
  async refund(orderNo, amount, reason = '') {
    try {
      const orders = await db.query('SELECT * FROM orders WHERE order_no = ?', [orderNo]);
      if (orders.length === 0) {
        return { success: false, message: '订单不存在' };
      }

      const order = orders[0];

      if (!this.isValidStatusTransition(order.status, OrderStatus.REFUNDED)) {
        logger.logSecurity('INVALID_REFUND_TRANSITION', '订单状态不允许退款', {
          orderNo,
          currentStatus: order.status
        });
        return { success: false, message: '订单状态不允许退款' };
      }

      if (amount <= 0) {
        return { success: false, message: '退款金额必须大于0' };
      }

      if (amount > order.final_amount) {
        logger.logSecurity('REFUND_AMOUNT_EXCEED', '退款金额超过订单金额', {
          orderNo,
          refundAmount: amount,
          orderAmount: order.final_amount
        });
        return { success: false, message: '退款金额不能超过订单金额' };
      }

      await db.transaction(async (connection) => {
        await connection.query(
          'UPDATE orders SET payment_status = ? WHERE order_no = ?',
          ['refunded', orderNo]
        );
        await connection.query(
          'INSERT INTO refund_log (order_id, amount, reason, status) VALUES (?, ?, ?, ?)',
          [order.id, amount, reason, 'pending']
        );
      });

      logger.logPayment(orderNo, '退款申请已提交', {
        amount,
        reason
      });

      return { success: true, message: '退款申请已提交' };
    } catch (error) {
      logger.error('退款失败:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService();
