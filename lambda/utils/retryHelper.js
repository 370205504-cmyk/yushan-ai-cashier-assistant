const logger = require('../utils/logger');

/**
 * 带指数退避的通用重试函数
 * 用于处理第三方接口调用失败时的重试逻辑
 *
 * @param {Function} fn - 需要重试的异步函数
 * @param {Object} options - 重试配置选项
 * @param {number} [options.retries=3] - 最大重试次数
 * @param {number} [options.initialDelay=1000] - 初始延迟(ms)
 * @param {number} [options.maxDelay=10000] - 最大延迟(ms)
 * @param {number} [options.factor=2] - 退避因子
 * @param {boolean} [options.jitter=true] - 是否添加抖动
 * @param {Function} [options.onRetry=null] - 重试回调函数
 * @returns {Promise<any>} 函数执行结果
 */
async function retryWithBackoff(fn, options = {}) {
  const {
    retries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
    jitter = true,
    onRetry = null
  } = options;

  let delay = initialDelay;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) {
        logger.error(`重试${retries}次后失败: ${error.message}`);
        throw error;
      }

      if (onRetry) {
        onRetry(attempt, error);
      }

      logger.warn(`第${attempt}次调用失败，等待${Math.round(delay)}ms后重试: ${error.message}`);

      await new Promise(resolve => setTimeout(resolve, delay));

      delay = Math.min(delay * factor, maxDelay);

      if (jitter) {
        delay = delay * (0.8 + Math.random() * 0.4);
      }
    }
  }
}

/**
 * 指数退避重试（默认配置）
 * 重试3次，延迟依次为: 1s, 2s, 4s
 *
 * @param {Function} fn - 需要重试的异步函数
 * @param {number} [retries=3] - 最大重试次数
 * @returns {Promise<any>} 函数执行结果
 */
async function retryWithExponentialBackoff(fn, retries = 3) {
  return retryWithBackoff(fn, {
    retries,
    initialDelay: 1000,
    maxDelay: 16000,
    factor: 2,
    jitter: true
  });
}

module.exports = {
  retryWithBackoff,
  retryWithExponentialBackoff
};
