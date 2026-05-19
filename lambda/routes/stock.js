const express = require('express');
const { body } = require('express-validator');
const stockService = require('../services/stockService');
const { requireAdmin } = require('../middleware/auth');
const { validate, inputSanitize } = require('../middleware/security');

const router = express.Router();

router.get('/:dishId',
  inputSanitize,
  async (req, res) => {
    try {
      const { dishId } = req.params;
      const result = await stockService.getStock(parseInt(dishId));
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.put('/update',
  requireAdmin,
  [
    body('dishId').isInt(),
    body('quantity').isInt(),
    body('reason').optional().isLength({ max: 255 })
  ],
  validate,
  async (req, res) => {
    try {
      const { dishId, quantity, reason } = req.body;
      const result = await stockService.updateStock(dishId, quantity, req.userId, reason);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/warning/low',
  requireAdmin,
  async (req, res) => {
    try {
      const result = await stockService.checkLowStock();
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/history/:dishId',
  requireAdmin,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 50;
      const result = await stockService.getReplenishHistory(parseInt(req.params.dishId), page, pageSize);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

module.exports = router;
