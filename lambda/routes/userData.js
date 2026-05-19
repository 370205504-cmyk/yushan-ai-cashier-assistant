const express = require('express');
const { requireAuth } = require('../middleware/auth');
const userService = require('../services/userService');
const { ApiResponse, ERROR_CODES } = require('../utils/response');
const logger = require('../utils/logger');

const router = express.Router();

router.delete('/account', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;

    await userService.deleteUserData(userId, userId, req.ip);

    res.json(ApiResponse.success(null, '账号已注销，所有数据已彻底删除'));
  } catch (error) {
    logger.error('注销账号失败:', error);
    res.status(500).json(ApiResponse.error(ERROR_CODES.SYSTEM_ERROR));
  }
});

router.post('/anonymize', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;

    await userService.anonymizeUserData(userId, userId, req.ip);

    res.json(ApiResponse.success(null, '个人数据已匿名化处理'));
  } catch (error) {
    logger.error('匿名化处理失败:', error);
    res.status(500).json(ApiResponse.error(ERROR_CODES.SYSTEM_ERROR));
  }
});

router.get('/export', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;

    const data = await userService.getDataExport(userId);

    res.json(ApiResponse.success(data, '数据导出成功'));
  } catch (error) {
    logger.error('导出用户数据失败:', error);
    res.status(500).json(ApiResponse.error(ERROR_CODES.SYSTEM_ERROR));
  }
});

module.exports = router;
