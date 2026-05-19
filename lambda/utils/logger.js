const winston = require('winston');
const { format } = winston;
const path = require('path');
const fs = require('fs');

const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const customFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(info => {
    const { timestamp, level, message, ...meta } = info;
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels: winston.config.npm.levels,
  format: customFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
      tailable: true
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
      tailable: true
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'info.log'),
      level: 'info',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
      tailable: true
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

logger.logOrder = (orderId, action, data = {}) => {
  logger.info(`[订单:${orderId}] ${action}`, { orderId, action, ...data });
};

logger.logOperation = (userId, action, data = {}) => {
  logger.info(`[操作:${userId}] ${action}`, { userId, action, ...data });
};

logger.logPayment = (orderId, action, data = {}) => {
  logger.info(`[支付:${orderId}] ${action}`, { orderId, action, ...data });
};

logger.logSecurity = (type, message, data = {}) => {
  logger.warn(`[安全:${type}] ${message}`, { type, message, ...data });
};

logger.logPerformance = (operation, duration, data = {}) => {
  logger.info(`[性能:${operation}] 耗时 ${duration}ms`, { operation, duration, ...data });
};

module.exports = logger;
