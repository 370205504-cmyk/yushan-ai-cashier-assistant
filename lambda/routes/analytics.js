const express = require('express');
const { query } = require('express-validator');
const analyticsService = require('../services/analyticsService');
const { requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/security');

const router = express.Router();

router.get('/dashboard',
  requireAdmin,
  async (req, res) => {
    try {
      const date = req.query.date || new Date().toISOString().split('T')[0];
      const result = await analyticsService.getDashboardStats(date);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/revenue',
  requireAdmin,
  [
    query('startDate').notEmpty(),
    query('endDate').notEmpty(),
    query('groupBy').optional().isIn(['hour', 'day', 'week', 'month'])
  ],
  validate,
  async (req, res) => {
    try {
      const { startDate, endDate, groupBy } = req.query;
      const result = await analyticsService.getRevenueStats(startDate, endDate, groupBy || 'day');
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/dishes',
  requireAdmin,
  [
    query('startDate').notEmpty(),
    query('endDate').notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validate,
  async (req, res) => {
    try {
      const { startDate, endDate, limit } = req.query;
      const result = await analyticsService.getDishStats(startDate, endDate, parseInt(limit) || 20);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/customers',
  requireAdmin,
  [
    query('startDate').notEmpty(),
    query('endDate').notEmpty()
  ],
  validate,
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const result = await analyticsService.getCustomerStats(startDate, endDate);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/hourly',
  requireAdmin,
  [
    query('date').notEmpty()
  ],
  validate,
  async (req, res) => {
    try {
      const result = await analyticsService.getHourlyStats(req.query.date);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/categories',
  requireAdmin,
  [
    query('startDate').notEmpty(),
    query('endDate').notEmpty()
  ],
  validate,
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const result = await analyticsService.getCategoryStats(startDate, endDate);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/retention',
  requireAdmin,
  [
    query('startDate').notEmpty(),
    query('endDate').notEmpty()
  ],
  validate,
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const result = await analyticsService.getRetentionRate(startDate, endDate);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/export',
  requireAdmin,
  [
    query('startDate').notEmpty(),
    query('endDate').notEmpty(),
    query('format').optional().isIn(['json', 'csv'])
  ],
  validate,
  async (req, res) => {
    try {
      const { startDate, endDate, format } = req.query;
      const result = await analyticsService.exportReport(startDate, endDate, format || 'json');

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=report-${startDate}-${endDate}.csv`);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

module.exports = router;
