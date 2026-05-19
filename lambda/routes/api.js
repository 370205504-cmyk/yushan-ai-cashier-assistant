const express = require('express');
const router = express.Router();
const dishesService = require('../services/dishesService');
const storeService = require('../services/storeService');
const wifiService = require('../utils/wifiService');
const logger = require('../utils/logger');

router.get('/menu', async (req, res, next) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;
    const result = await dishesService.getMenu({ category, page: parseInt(page), limit: parseInt(limit) });
    logger.info('获取菜单', { category, page, limit });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/dishes', async (req, res, next) => {
  try {
    const { id, name, category } = req.query;
    let result;

    if (id) {
      result = await dishesService.getDishById(id);
    } else if (name) {
      result = await dishesService.searchDishes(name);
    } else if (category) {
      result = await dishesService.getDishesByCategory(category);
    } else {
      result = await dishesService.getAllDishes();
    }

    logger.info('查询菜品', { id, name, category });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/recommend', async (req, res, next) => {
  try {
    const { taste, budget, count = 3 } = req.query;
    const result = await dishesService.recommendDishes({ taste, budget, count: parseInt(count) });
    logger.info('智能推荐', { taste, budget, count });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/stores', async (req, res, next) => {
  try {
    const result = await storeService.getAllStores();
    logger.info('查询门店');
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/wifi', async (req, res, next) => {
  try {
    const result = await wifiService.getWifiPassword();
    logger.info('获取WiFi');
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/docs', (req, res) => {
  res.json({
    title: '雨姗AI收银助手创味菜 - API文档',
    version: '1.0.0',
    endpoints: [
      { method: 'GET', path: '/api/v1/menu', description: '获取菜单列表' },
      { method: 'GET', path: '/api/v1/dishes', description: '查询菜品' },
      { method: 'GET', path: '/api/v1/recommend', description: '智能推荐菜品' },
      { method: 'GET', path: '/api/v1/stores', description: '查询门店信息' },
      { method: 'GET', path: '/api/v1/wifi', description: '获取WiFi密码' },
      { method: 'GET', path: '/api/v1/cart/:userId', description: '获取购物车' },
      { method: 'POST', path: '/api/v1/cart/add', description: '添加商品到购物车' },
      { method: 'POST', path: '/api/v1/cart/remove', description: '从购物车移除商品' },
      { method: 'POST', path: '/api/v1/cart/clear', description: '清空购物车' },
      { method: 'POST', path: '/api/v1/order/create', description: '创建订单' },
      { method: 'GET', path: '/api/v1/order/:orderId', description: '查询订单详情' },
      { method: 'PUT', path: '/api/v1/order/:orderId/status', description: '更新订单状态' },
      { method: 'GET', path: '/api/v1/orders', description: '查询订单列表' },
      { method: 'POST', path: '/api/v1/order/:orderId/print', description: '打印订单小票' }
    ]
  });
});

module.exports = router;