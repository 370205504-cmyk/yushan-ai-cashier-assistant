const express = require('express');
const { body } = require('express-validator');
const authService = require('../services/authService');
const { authLimiter, validate } = require('../middleware/security');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register',
  authLimiter,
  [
    body('phone').isMobilePhone('zh-CN').withMessage('请输入有效的手机号'),
    body('password').isLength({ min: 6 }).withMessage('密码至少6位'),
    body('nickname').optional().isLength({ min: 2, max: 20 }).withMessage('昵称2-20字符')
  ],
  validate,
  async (req, res) => {
    try {
      const { phone, password, nickname } = req.body;
      const result = await authService.register(phone, password, nickname);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.post('/login',
  authLimiter,
  [
    body('phone').isMobilePhone('zh-CN').withMessage('请输入有效的手机号'),
    body('password').notEmpty().withMessage('请输入密码')
  ],
  validate,
  async (req, res) => {
    try {
      const { phone, password } = req.body;
      const result = await authService.login(phone, password);
      res.status(result.success ? 200 : 401).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.post('/wechat',
  authLimiter,
  [
    body('openid').notEmpty().withMessage('openid不能为空')
  ],
  validate,
  async (req, res) => {
    try {
      const { openid, nickname, avatar } = req.body;
      const result = await authService.wechatLogin(openid, nickname, avatar);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/profile',
  requireAuth,
  async (req, res) => {
    try {
      const result = await authService.getUserInfo(req.userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.put('/profile',
  requireAuth,
  [
    body('nickname').optional().isLength({ min: 2, max: 20 }),
    body('avatar').optional().isURL(),
    body('address').optional().isLength({ max: 255 })
  ],
  validate,
  async (req, res) => {
    try {
      const result = await authService.updateUser(req.userId, req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.post('/change-password',
  requireAuth,
  [
    body('oldPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
  ],
  validate,
  async (req, res) => {
    try {
      const { oldPassword, newPassword } = req.body;
      const result = await authService.changePassword(req.userId, oldPassword, newPassword);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/points/history',
  requireAuth,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 20;
      const result = await authService.getPointsHistory(req.userId, page, pageSize);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

module.exports = router;
