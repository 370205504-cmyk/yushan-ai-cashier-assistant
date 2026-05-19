const express = require('express');
const { body } = require('express-validator');
const deliveryService = require('../services/deliveryService');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/security');

const router = express.Router();

router.post('/create',
  requireAuth,
  [
    body('orderId').isInt(),
    body('address').notEmpty().isLength({ max: 255 }),
    body('contactPhone').isMobilePhone('zh-CN'),
    body('contactName').optional().isLength({ max: 50 })
  ],
  validate,
  async (req, res) => {
    try {
      const { orderId, address, contactPhone, contactName } = req.body;
      const result = await deliveryService.createDelivery(orderId, address, contactPhone, contactName);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/:deliveryNo',
  requireAuth,
  async (req, res) => {
    try {
      const result = await deliveryService.getDeliveryInfo(req.params.deliveryNo);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.put('/:deliveryNo/assign',
  requireAdmin,
  [
    body('driverId').isInt()
  ],
  validate,
  async (req, res) => {
    try {
      const result = await deliveryService.assignDriver(req.params.deliveryNo, req.body.driverId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.put('/:deliveryNo/status',
  requireAuth,
  [
    body('status').isIn(['assigned', 'picking_up', 'delivering', 'completed', 'cancelled']),
    body('location').optional().isObject()
  ],
  validate,
  async (req, res) => {
    try {
      const { status, location } = req.body;
      const result = await deliveryService.updateStatus(req.params.deliveryNo, status, location);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/driver/:driverId/list',
  requireAuth,
  async (req, res) => {
    try {
      const result = await deliveryService.getDriverDeliveries(req.params.driverId, req.query.status);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/nearby',
  requireAuth,
  async (req, res) => {
    try {
      const { lat, lng, radius } = req.query;
      if (!lat || !lng) {
        return res.status(400).json({ success: false, message: '需要经纬度参数' });
      }
      const result = await deliveryService.getNearbyOrders(parseFloat(lat), parseFloat(lng), parseFloat(radius) || 5);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.put('/driver/:driverId/location',
  requireAuth,
  [
    body('lat').isFloat(),
    body('lng').isFloat()
  ],
  validate,
  async (req, res) => {
    try {
      const result = await deliveryService.updateDriverLocation(req.params.driverId, req.body.lat, req.body.lng);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

module.exports = router;
