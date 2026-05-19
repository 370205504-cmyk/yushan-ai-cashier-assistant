const express = require('express');
const { body } = require('express-validator');
const queueService = require('../services/queueService');
const { optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/security');

const router = express.Router();

router.post('/take',
  optionalAuth,
  [
    body('store_id').notEmpty().withMessage('门店ID不能为空'),
    body('table_type').isIn(['small', 'medium', 'large', '包间']).withMessage('无效的桌型'),
    body('people').isInt({ min: 1, max: 20 }).withMessage('人数必须在1-20之间')
  ],
  validate,
  async (req, res) => {
    try {
      const { store_id, table_type, people } = req.body;
      const userId = req.userId || req.body.user_id || null;

      const result = await queueService.takeQueue(store_id, table_type, people, userId);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/query/:queueId',
  async (req, res) => {
    try {
      const result = await queueService.queryQueue(req.params.queueId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.post('/cancel/:queueId',
  async (req, res) => {
    try {
      const result = await queueService.cancelQueue(req.params.queueId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.post('/call',
  [
    body('store_id').notEmpty(),
    body('table_type').isIn(['small', 'medium', 'large', '包间'])
  ],
  validate,
  async (req, res) => {
    try {
      const { store_id, table_type } = req.body;
      const result = await queueService.callNext(store_id, table_type);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.get('/list/:storeId',
  async (req, res) => {
    try {
      const result = await queueService.getWaitingList(req.params.storeId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }
);

router.post('/meituan/callback',
  async (req, res) => {
    try {
      const result = await queueService.meituanCallback(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '处理失败' });
    }
  }
);

module.exports = router;
