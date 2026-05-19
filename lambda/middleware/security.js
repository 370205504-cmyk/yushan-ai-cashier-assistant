const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const { body, param, query, validationResult } = require('express-validator');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.File({ filename: 'logs/security.log' })]
});

const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { success: false, message: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: '登录尝试次数过多，请15分钟后重试' },
  standardHeaders: true,
  legacyHeaders: false
});

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { success: false, message: '支付请求过于频繁' },
  standardHeaders: true,
  legacyHeaders: false
});

const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { success: false, message: '下单过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip
});


const agentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, message: 'Agent请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip
});
const helmetConfig = helmet({
  contentSecurityPolicy: {
    reportOnly: process.env.CSP_REPORT_ONLY === 'true',
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"],
      upgradeInsecureRequests: process.env.UPGRADE_INSECURE_REQUESTS === 'true' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: { allow: false },
  expectCt: { maxAge: 86400, enforce: true },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  originKeyedWorkers: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
});

const isProduction = process.env.NODE_ENV === 'production';

const corsConfig = cors({
  origin: isProduction
    ? (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',')
    : '*',
  methods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-ID'],
  credentials: true,
  maxAge: 86400
});

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('输入验证失败', { errors: errors.array(), ip: req.ip });
    return res.status(400).json({
      success: false,
      message: '输入验证失败',
      errors: errors.array()
    });
  }
  next();
};

const sensitivePatterns = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /on[a-zA-Z]+\s*=\s*["']?[^"'>]+["']?/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:/gi,
  /eval\s*\(/gi,
  /document\.cookie/gi,
  /document\.write/gi,
  /window\.location/gi,
  /<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi,
  /<body\b[^<]*(?:(?!<\/body>)<[^<]*)*<\/body>/gi,
  /<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi,
  /<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi,
  /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
  /<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi,
  /<input\b[^<]*(?:(?!<\/input>)<[^<]*)*\/?>/gi,
  /<button\b[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi,
  /<script/gi,
  /<\/script/gi,
  /expression\s*\(/gi,
  /behaviors/gi,
  /vbscript/gi,
  /jscript/gi,
  /livescript/gi,
  /mocha:/gi,
  /about:/gi,
  /xmlns/gi,
  /-->/gi,
  /\]\]>/gi,
  /<%/gi,
  /%>/gi,
  /<\?/gi,
  /\?>/gi,
  /<!DOCTYPE/gi
];

const sanitizeString = (str, options = {}) => {
  if (typeof str !== 'string') {
    return str;
  }

  let result = str.trim();

  if (options.stripHtml !== false) {
    sensitivePatterns.forEach(pattern => {
      result = result.replace(pattern, '');
    });
  }

  if (options.escapeHtml !== false) {
    result = result
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  if (options.maxLength && result.length > options.maxLength) {
    result = result.substring(0, options.maxLength);
  }

  result = result.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

  return result;
};

const sanitizeObject = (obj, path = '') => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item, index) => sanitizeObject(item, `${path}[${index}]`));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (typeof value === 'string') {
      const maxLength = getMaxLengthForField(key);
      const skipEscape = shouldSkipEscape(key);
      sanitized[key] = sanitizeString(value, { maxLength, stripHtml: !skipEscape, escapeHtml: !skipEscape });
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item, index) => 
        typeof item === 'string' ? sanitizeString(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, currentPath);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

const getMaxLengthForField = (fieldName) => {
  const fieldLimits = {
    name: 100,
    phone: 20,
    email: 255,
    address: 500,
    remark: 1000,
    search: 200,
    orderNo: 50,
    userId: 50,
    password: 128,
    token: 500,
    message: 3000
  };
  return fieldLimits[fieldName.toLowerCase()] || 500;
};

const shouldSkipEscape = (fieldName) => {
  const skipFields = ['apikey', 'secretkey', 'api_key', 'secret_key', 'password', 'token'];
  return skipFields.includes(fieldName.toLowerCase());
};

const inputSanitize = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  if (req.headers && typeof req.headers['x-custom-data'] === 'string') {
    req.headers['x-custom-data'] = sanitizeString(req.headers['x-custom-data']);
  }
  next();
};

const ipBlacklist = new Set();
const ipRequestCounts = new Map();

const ipProtection = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  if (ipBlacklist.has(ip)) {
    logger.warn(`黑名单IP访问: ${ip}`);
    return res.status(403).json({ success: false, message: '访问被拒绝' });
  }

  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 60;

  let count = ipRequestCounts.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > count.resetAt) {
    count = { count: 0, resetAt: now + windowMs };
  }

  count.count++;
  ipRequestCounts.set(ip, count);

  if (count.count > maxRequests) {
    logger.warn(`IP请求超限: ${ip}`);
    ipBlacklist.add(ip);
    return res.status(429).json({ success: false, message: '请求过于频繁，请稍后再试' });
  }

  next();
};

const addToBlacklist = (ip) => {
  ipBlacklist.add(ip);
  logger.info(`IP加入黑名单: ${ip}`);
};

const removeFromBlacklist = (ip) => {
  ipBlacklist.delete(ip);
  logger.info(`IP移出黑名单: ${ip}`);
};

const xssProtection = (req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  next();
};

const generateCsrfToken = () => {
  return uuidv4();
};

const csrfWhitelist = [];

const csrfProtection = (req, res, next) => {
  if (csrfWhitelist.some(path => req.path.startsWith(path))) {
    return next();
  }

  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    if (!req.session?.csrfToken) {
      req.session.csrfToken = generateCsrfToken();
    }
    res.setHeader('X-CSRF-Token', req.session.csrfToken);
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf || req.query._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!sessionToken) {
    logger.warn(`CSRF攻击尝试: 缺少session token, IP: ${req.ip}`);
    return res.status(403).json({ success: false, message: '会话无效，请重新登录' });
  }

  if (!token || token !== sessionToken) {
    logger.warn(`CSRF攻击尝试: Token不匹配, IP: ${req.ip}`);
    return res.status(403).json({ success: false, message: '无效的请求令牌' });
  }

  req.session.csrfToken = generateCsrfToken();
  res.setHeader('X-CSRF-Token', req.session.csrfToken);

  next();
};

const validatePasswordStrength = (password) => {
  if (!password || password.length < 8) {
    return { valid: false, message: '密码长度至少8位' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: '密码需包含大写字母' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: '密码需包含小写字母' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: '密码需包含数字' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    return { valid: false, message: '密码需包含特殊字符' };
  }
  return { valid: true, message: '密码强度符合要求' };
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
};

module.exports = {
  apiLimiter,
  authLimiter,
  paymentLimiter,
  orderLimiter,
  agentLimiter,
  helmetConfig,
  corsConfig,
  validate,
  inputSanitize,
  ipProtection,
  xssProtection,
  csrfProtection,
  addToBlacklist,
  removeFromBlacklist,
  validatePasswordStrength,
  validateEmail,
  validatePhone,
  sanitizeString,
  sanitizeObject,
  generateCsrfToken
};