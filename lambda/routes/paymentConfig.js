const express = require('express');
const { body, param } = require('express-validator');
const paymentConfigService = require('../services/paymentConfigService');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/security');

const router = express.Router();

router.get('/payment-configs',
  requireAdmin,
  async (req, res) => {
    try {
      const result = await paymentConfigService.getConfigs(req.query.store_id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/payment-configs/wechat',
  async (req, res) => {
    try {
      const result = await paymentConfigService.getWechatConfig(req.query.store_id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/payment-configs/alipay',
  async (req, res) => {
    try {
      const result = await paymentConfigService.getAlipayConfig(req.query.store_id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.post('/payment-configs',
  requireAdmin,
  [
    body('config_type').isIn(['wechat', 'alipay']).withMessage('配置类型必须是wechat或alipay'),
    body('app_id').optional().notEmpty().withMessage('应用ID不能为空'),
  ],
  validate,
  async (req, res) => {
    try {
      const result = await paymentConfigService.createConfig(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.put('/payment-configs/:id',
  requireAdmin,
  async (req, res) => {
    try {
      const result = await paymentConfigService.updateConfig(parseInt(req.params.id), req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.delete('/payment-configs/:id',
  requireAdmin,
  async (req, res) => {
    try {
      const result = await paymentConfigService.deleteConfig(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

module.exports = router;
