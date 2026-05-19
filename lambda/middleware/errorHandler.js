const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('请求错误', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  let statusCode = 500;
  let message = '服务器内部错误';
  let code = 1000;
  let errors = null;

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = '数据验证失败';
    code = 1001;
    errors = err.errors;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = '认证失败';
    code = 2000;
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = '文件大小超出限制';
    code = 1002;
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = '无效的请求数据';
    code = 1003;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = '无效的令牌';
    code = 2001;
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = '令牌已过期';
    code = 2002;
  } else if (err.statusCode || err.status) {
    statusCode = err.statusCode || err.status;
    message = err.message;
  }

  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = '服务器内部错误';
  }

  const response = {
    success: false,
    code,
    message
  };

  if (errors) {
    response.errors = errors;
  }

  if (process.env.NODE_ENV !== 'production' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

class AppError extends Error {
  constructor(message, statusCode = 500, code = 1000) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = null) {
    super(message, 400, 1001);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

class UnauthorizedError extends AppError {
  constructor(message = '认证失败') {
    super(message, 401, 2000);
    this.name = 'UnauthorizedError';
  }
}

class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super(message, 404, 1004);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = '资源冲突') {
    super(message, 409, 1005);
    this.name = 'ConflictError';
  }
}

module.exports = {
  errorHandler,
  AppError,
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ConflictError
};
