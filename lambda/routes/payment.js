const express = require('express');
const { body } = require('express-validator');
const paymentService = require('../services/paymentService');
const { requireAuth } = require('../middleware/auth');
const { paymentLimiter, validate } = require('../middleware/security');
const logger = require('../utils/logger');
const crypto = require('crypto');

const router = express.Router();

const ALIPAY_SIGN_CHECK_ENABLED = true;
const WECHAT_SIGN_CHECK_ENABLED = true;

function verifyAlipaySign(req) {
  const { sign_type, sign } = req.body;
  if (!sign) {
    return false;
  }

  const params = {};
  for (const key of Object.keys(req.body)) {
    if (key !== 'sign' && key !== 'sign_type') {
      params[key] = req.body[key];
    }
  }

  const sortedKeys = Object.keys(params).sort();
  const signStr = sortedKeys.map(k => {
    const value = params[k];
    if (value === null || value === undefined || value === '') {
      return `${k}=`;
    }
    return `${k}=${value}`;
  }).join('&');

  const privateKey = process.env.ALIPAY_PRIVATE_KEY || '';
  const expectedSign = crypto
    .createHmac('sha256', privateKey)
    .update(signStr, 'utf8')
    .digest('base64');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(sign),
      Buffer.from(expectedSign)
    );
  } catch (e) {
    return false;
  }
}

function verifyWechatSign(req) {
  const { sign } = req.body;
  if (!sign) {
    return false;
  }

  const obj = { ...req.body };
  delete obj.sign;

  const sortedKeys = Object.keys(obj).sort();
  let signStr = sortedKeys.map(k => `${k}=${obj[k]}`).join('&');
  signStr += `&key=${process.env.WECHAT_APIKEY}`;

  const calculatedSign = crypto.createHash('md5')
    .update(signStr, 'utf8')
    .digest('hex')
    .toUpperCase();

  try {
    return crypto.timingSafeEqual(
      Buffer.from(sign),
      Buffer.from(calculatedSign)
    );
  } catch (e) {
    return false;
  }
}

router.post('/create',
  requireAuth,
  paymentLimiter,
  [
    body('orderNo').notEmpty(),
    body('method').isIn(['wechat', 'alipay']),
    body('finalAmount').isFloat({ min: 0.01 })
  ],
  validate,
  async (req, res) => {
    try {
      const { orderNo, method, finalAmount } = req.body;
      const order = { orderNo, finalAmount };

      let result;
      if (method === 'wechat') {
        result = await paymentService.createWechatPayOrder(order);
      } else if (method === 'alipay') {
        result = await paymentService.createAlipayOrder(order);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.post('/wechat/callback',
  async (req, res) => {
    try {
      if (WECHAT_SIGN_CHECK_ENABLED) {
        if (!verifyWechatSign(req)) {
          logger.error('微信支付回调签名验证失败');
          return res.status(400).json({ code: 'FAIL', message: '签名验证失败' });
        }
      }

      const result = await paymentService.handleWechatCallback(req.body);
      if (result.success) {
        res.status(200).json({ code: 'SUCCESS', message: '成功' });
      } else {
        res.status(400).json({ code: 'FAIL', message: result.message });
      }
    } catch (error) {
      logger.error('微信回调处理异常:', error);
      res.status(500).json({ code: 'FAIL', message: '处理失败' });
    }
  }
);

router.post('/alipay/callback',
  async (req, res) => {
    try {
      if (ALIPAY_SIGN_CHECK_ENABLED) {
        if (!verifyAlipaySign(req)) {
          logger.error('支付宝回调签名验证失败');
          return res.status(400).json({ code: 'FAIL', message: '签名验证失败' });
        }
      }

      const result = await paymentService.handleAlipayCallback(req.body);
      if (result.success) {
        res.status(200).json({ code: 'SUCCESS', message: '成功' });
      } else {
        res.status(400).json({ code: 'FAIL', message: result.message });
      }
    } catch (error) {
      logger.error('支付宝回调处理异常:', error);
      res.status(500).json({ code: 'FAIL', message: '处理失败' });
    }
  }
);

router.get('/status/:orderNo',
  requireAuth,
  async (req, res) => {
    try {
      const { orderNo } = req.params;
      const result = await paymentService.queryPaymentStatus(orderNo);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.post('/refund',
  requireAuth,
  [
    body('orderNo').notEmpty(),
    body('amount').isFloat({ min: 0.01 }),
    body('reason').optional().isLength({ max: 255 })
  ],
  validate,
  async (req, res) => {
    try {
      const { orderNo, amount, reason } = req.body;
      const result = await paymentService.refund(orderNo, amount, reason);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

module.exports = router;
