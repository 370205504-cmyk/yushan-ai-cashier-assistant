const ERROR_CODES = {
  SUCCESS: 0,
  SYSTEM_ERROR: 1000,
  PARAM_ERROR: 1001,
  UNAUTHORIZED: 1002,
  FORBIDDEN: 1003,
  NOT_FOUND: 1004,
  CONFLICT: 1005,
  VALIDATION_ERROR: 1006,

  ORDER_NOT_EXIST: 2001,
  ORDER_ALREADY_PAID: 2002,
  ORDER_EXPIRED: 2003,
  ORDER_CANCELLED: 2004,
  ORDER_STATUS_ERROR: 2005,
  INSUFFICIENT_STOCK: 2006,

  PAYMENT_FAILED: 3001,
  PAYMENT_TIMEOUT: 3002,
  PAYMENT_SIGN_INVALID: 3003,
  PAYMENT_AMOUNT_MISMATCH: 3004,
  REFUND_FAILED: 3005,
  REFUND_EXCEED_AMOUNT: 3006,

  USER_NOT_EXIST: 4001,
  USER_ALREADY_EXISTS: 4002,
  USER_DISABLED: 4003,
  USER_DATA_DELETED: 4004,

  DISH_NOT_EXIST: 5001,
  DISH_UNAVAILABLE: 5002,
  DISH_OUT_OF_STOCK: 5003,

  STOCK_INSUFFICIENT: 6001,
  STOCK_UPDATE_FAILED: 6002,

  DATABASE_ERROR: 7001,
  REDIS_ERROR: 7002,
  EXTERNAL_SERVICE_ERROR: 7003,

  RATE_LIMIT_EXCEEDED: 8001,
  IP_BLOCKED: 8002
};

const ERROR_MESSAGES = {
  [ERROR_CODES.SUCCESS]: '操作成功',
  [ERROR_CODES.SYSTEM_ERROR]: '系统错误，请稍后再试',
  [ERROR_CODES.PARAM_ERROR]: '参数错误',
  [ERROR_CODES.UNAUTHORIZED]: '未授权，请先登录',
  [ERROR_CODES.FORBIDDEN]: '权限不足',
  [ERROR_CODES.NOT_FOUND]: '资源不存在',
  [ERROR_CODES.CONFLICT]: '资源冲突',
  [ERROR_CODES.VALIDATION_ERROR]: '数据校验失败',

  [ERROR_CODES.ORDER_NOT_EXIST]: '订单不存在',
  [ERROR_CODES.ORDER_ALREADY_PAID]: '订单已支付',
  [ERROR_CODES.ORDER_EXPIRED]: '订单已过期',
  [ERROR_CODES.ORDER_CANCELLED]: '订单已取消',
  [ERROR_CODES.ORDER_STATUS_ERROR]: '订单状态错误',
  [ERROR_CODES.INSUFFICIENT_STOCK]: '库存不足',

  [ERROR_CODES.PAYMENT_FAILED]: '支付失败',
  [ERROR_CODES.PAYMENT_TIMEOUT]: '支付超时',
  [ERROR_CODES.PAYMENT_SIGN_INVALID]: '支付签名验证失败',
  [ERROR_CODES.PAYMENT_AMOUNT_MISMATCH]: '支付金额不匹配',
  [ERROR_CODES.REFUND_FAILED]: '退款失败',
  [ERROR_CODES.REFUND_EXCEED_AMOUNT]: '退款金额超出支付金额',

  [ERROR_CODES.USER_NOT_EXIST]: '用户不存在',
  [ERROR_CODES.USER_ALREADY_EXISTS]: '用户已存在',
  [ERROR_CODES.USER_DISABLED]: '用户已被禁用',
  [ERROR_CODES.USER_DATA_DELETED]: '用户数据已删除',

  [ERROR_CODES.DISH_NOT_EXIST]: '菜品不存在',
  [ERROR_CODES.DISH_UNAVAILABLE]: '菜品已下架',
  [ERROR_CODES.DISH_OUT_OF_STOCK]: '菜品已售罄',

  [ERROR_CODES.STOCK_INSUFFICIENT]: '库存不足',
  [ERROR_CODES.STOCK_UPDATE_FAILED]: '库存更新失败',

  [ERROR_CODES.DATABASE_ERROR]: '数据库错误',
  [ERROR_CODES.REDIS_ERROR]: '缓存服务错误',
  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: '外部服务错误',

  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: '请求过于频繁',
  [ERROR_CODES.IP_BLOCKED]: 'IP已被限制'
};

class ApiResponse {
  static success(data = null, message = null) {
    return {
      code: ERROR_CODES.SUCCESS,
      message: message || ERROR_MESSAGES[ERROR_CODES.SUCCESS],
      data,
      timestamp: new Date().toISOString()
    };
  }

  static error(code, details = null) {
    return {
      code,
      message: ERROR_MESSAGES[code] || '未知错误',
      details,
      timestamp: new Date().toISOString()
    };
  }

  static paginated(data, pagination) {
    return {
      code: ERROR_CODES.SUCCESS,
      message: ERROR_MESSAGES[ERROR_CODES.SUCCESS],
      data,
      pagination,
      timestamp: new Date().toISOString()
    };
  }
}

function validateInput(rules, data) {
  const errors = [];

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];

    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({ field, message: `${field}不能为空` });
      continue;
    }

    if (value !== undefined && value !== null && value !== '') {
      if (rule.type === 'string') {
        if (typeof value !== 'string') {
          errors.push({ field, message: `${field}必须是字符串` });
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push({ field, message: `${field}长度不能超过${rule.maxLength}` });
        }
        if (rule.minLength && value.length < rule.minLength) {
          errors.push({ field, message: `${field}长度不能少于${rule.minLength}` });
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push({ field, message: rule.patternMessage || `${field}格式不正确` });
        }
      }

      if (rule.type === 'number') {
        if (typeof value !== 'number') {
          errors.push({ field, message: `${field}必须是数字` });
        }
        if (rule.min !== undefined && value < rule.min) {
          errors.push({ field, message: `${field}不能小于${rule.min}` });
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push({ field, message: `${field}不能大于${rule.max}` });
        }
      }
    }
  }

  return errors;
}

module.exports = {
  ERROR_CODES,
  ERROR_MESSAGES,
  ApiResponse,
  validateInput
};
