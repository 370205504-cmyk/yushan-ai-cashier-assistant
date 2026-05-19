const express = require('express');
const { body, param } = require('express-validator');
const storeService = require('../services/storeService');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/security');
const { handleUpload } = require('../middleware/upload');

const router = express.Router();

router.get('/stores',
  async (req, res) => {
    try {
      const { lat, lng, radius } = req.query;

      if (lat && lng) {
        const result = await storeService.getNearbyStores(parseFloat(lat), parseFloat(lng), parseFloat(radius) || 10);
        return res.json(result);
      }

      const result = await storeService.getStores();
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/stores/default',
  async (req, res) => {
    try {
      const result = await storeService.getDefaultStore();
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/stores/info',
  async (req, res) => {
    try {
      const result = await storeService.getStoreInfo(req.query.store_id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/stores/business-hours',
  async (req, res) => {
    try {
      const result = await storeService.getBusinessHours(req.query.store_id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/stores/wifi',
  async (req, res) => {
    try {
      const result = await storeService.getWifiInfo(req.query.store_id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/stores/parking',
  async (req, res) => {
    try {
      const result = await storeService.getParkingInfo(req.query.store_id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/stores/contact',
  async (req, res) => {
    try {
      const result = await storeService.getContactInfo(req.query.store_id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/stores/address',
  async (req, res) => {
    try {
      const result = await storeService.getAddress(req.query.store_id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/stores/phone',
  async (req, res) => {
    try {
      const result = await storeService.getPhone(req.query.store_id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/stores/services',
  async (req, res) => {
    try {
      const result = await storeService.getStoreServices(req.query.store_id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/stores/announcements',
  async (req, res) => {
    try {
      const result = await storeService.getAnnouncements(req.query.store_id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/stores/reservation',
  async (req, res) => {
    try {
      const result = await storeService.getReservationInfo(req.query.store_id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/stores/takeout',
  async (req, res) => {
    try {
      const result = await storeService.getTakeoutInfo(req.query.store_id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/stores/:id',
  async (req, res) => {
    try {
      const result = await storeService.getStores(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/stores/:id/stats',
  requireAdmin,
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const today = new Date().toISOString().split('T')[0];
      const result = await storeService.getStoreStats(
        parseInt(req.params.id),
        startDate || today,
        endDate || today
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/stores/:id/settings',
  requireAdmin,
  async (req, res) => {
    try {
      const result = await storeService.getStoreSettings(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.put('/stores/:id/settings',
  requireAdmin,
  async (req, res) => {
    try {
      const result = await storeService.updateStoreSettings(parseInt(req.params.id), req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.post('/stores',
  requireAdmin,
  handleUpload,
  [
    body('name').notEmpty().isLength({ max: 100 }),
    body('address').notEmpty().isLength({ max: 255 }),
    body('phone').isMobilePhone('zh-CN')
  ],
  validate,
  async (req, res) => {
    try {
      const result = await storeService.createStore(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.put('/stores/:id',
  requireAdmin,
  handleUpload,
  async (req, res) => {
    try {
      const result = await storeService.updateStore(parseInt(req.params.id), req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.put('/stores/:id/default',
  requireAdmin,
  async (req, res) => {
    try {
      const result = await storeService.setDefaultStore(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.delete('/stores/:id',
  requireAdmin,
  async (req, res) => {
    try {
      await storeService.updateStore(parseInt(req.params.id), { status: 'inactive' });
      res.json({ success: true, message: '门店已禁用' });
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

module.exports = router;
