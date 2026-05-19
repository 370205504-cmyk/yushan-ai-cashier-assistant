const express = require('express');
const { body } = require('express-validator');
const memberService = require('../services/memberService');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/security');

const router = express.Router();

router.get('/info',
  requireAuth,
  async (req, res) => {
    try {
      const result = await memberService.getMemberInfo(req.userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.post('/recharge',
  requireAuth,
  [
    body('amount').isFloat({ min: 10 })
  ],
  validate,
  async (req, res) => {
    try {
      const { amount } = req.body;
      const result = await memberService.recharge(req.userId, amount);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/coupons',
  requireAuth,
  async (req, res) => {
    try {
      const status = req.query.status || 'unused';
      const result = await memberService.getCoupons(req.userId, status);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.post('/coupons/claim',
  requireAuth,
  [
    body('code').notEmpty()
  ],
  validate,
  async (req, res) => {
    try {
      const { code } = req.body;
      const result = await memberService.claimCoupon(req.userId, code);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

module.exports = router;
