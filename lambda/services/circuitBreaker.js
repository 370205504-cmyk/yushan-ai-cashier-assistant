const CircuitBreaker = require('opossum');

const db = require('../database/db');
const logger = require('../utils/logger');

/**
 * 熔断器降级处理函数
 * 当熔断器打开时，返回降级响应，避免服务雪崩
 */
const dbFallback = () => {
  logger.error('数据库熔断器已触发');
  return { success: false, message: '系统繁忙，请稍后再试' };
};

const payFallback = () => {
  logger.error('支付熔断器已触发');
  return { success: false, message: '支付系统繁忙，请前往前台付款' };
};

const externalApiFallback = (error) => {
  logger.error(`外部API熔断器已触发: ${error.message}`);
  return { success: false, message: '外部服务暂时不可用，请稍后再试' };
};

/**
 * 数据库查询熔断器配置
 * - timeout: 3秒超时
 * - errorThresholdPercentage: 50%错误率触发熔断
 * - resetTimeout: 10秒后尝试半开状态
 */
const dbBreaker = new CircuitBreaker(db.query, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 10000,
  fallback: dbFallback,
  name: 'database'
});

/**
 * 微信支付接口熔断器配置
 * - timeout: 5秒超时（支付接口较慢）
 * - errorThresholdPercentage: 50%错误率触发熔断
 * - resetTimeout: 10秒后尝试半开状态
 */
const payBreaker = new CircuitBreaker(async (params) => {
  const wechatPay = require('../integrations/wechatPay');
  return await wechatPay.createOrder(params);
}, {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 10000,
  fallback: payFallback,
  name: 'payment'
});

/**
 * 外部API通用熔断器配置
 * - timeout: 10秒超时（第三方接口可能较慢）
 * - errorThresholdPercentage: 50%错误率触发熔断
 * - resetTimeout: 15秒后尝试半开状态
 */
const externalApiBreaker = new CircuitBreaker(async (fn) => {
  return await fn();
}, {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 15000,
  fallback: externalApiFallback,
  name: 'external-api'
});

/**
 * 数据库熔断器事件监听
 */
dbBreaker.on('open', () => {
  logger.error('数据库熔断器已打开');
});

dbBreaker.on('close', () => {
  logger.info('数据库熔断器已关闭');
});

dbBreaker.on('halfOpen', () => {
  logger.info('数据库熔断器进入半开状态');
});

/**
 * 支付熔断器事件监听
 */
payBreaker.on('open', () => {
  logger.error('支付熔断器已打开');
});

payBreaker.on('close', () => {
  logger.info('支付熔断器已关闭');
});

payBreaker.on('halfOpen', () => {
  logger.info('支付熔断器进入半开状态');
});

module.exports = {
  dbBreaker,
  payBreaker,
  externalApiBreaker,
  CircuitBreaker
};
