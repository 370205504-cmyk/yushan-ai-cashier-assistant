const jwt = require('jsonwebtoken');
const db = require('../database/db');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY = '2h';
const SESSION_EXPIRY_HOURS = 2;

const optionalAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    req.userId = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      req.userId = null;
      return next();
    }
    
    const isValid = await checkTokenValidity(token);
    if (!isValid) {
      req.userId = null;
      return next();
    }

    req.userId = decoded.userId;
    req.userRole = decoded.role;
    req.tokenExpiry = decoded.exp;
  } catch (error) {
    req.userId = null;
  }
  next();
};

const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '') ||
    (req.cookies?.token && req.cookies.token);

  if (!token) {
    return res.status(401).json({ success: false, message: '请先登录' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ success: false, message: '登录已过期，请重新登录' });
    }

    const isValid = await checkTokenValidity(token);
    if (!isValid) {
      return res.status(401).json({ success: false, message: '令牌已失效，请重新登录' });
    }

    req.userId = decoded.userId;
    req.userRole = decoded.role;
    req.tokenExpiry = decoded.exp;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: '登录已过期' });
  }
};

const requireAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '') ||
    (req.cookies?.token && req.cookies.token);

  if (!token) {
    return res.status(401).json({ success: false, message: '请先登录' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ success: false, message: '登录已过期，请重新登录' });
    }

    const isValid = await checkTokenValidity(token);
    if (!isValid) {
      return res.status(401).json({ success: false, message: '令牌已失效，请重新登录' });
    }

    if (decoded.role !== 'admin' && decoded.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: '需要管理员权限' });
    }

    req.userId = decoded.userId;
    req.userRole = decoded.role;
    req.isAdmin = true;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: '登录已过期' });
  }
};

const requirePermission = (permission) => {
  return async (req, res, next) => {
    if (!req.isAdmin) {
      return res.status(403).json({ success: false, message: '需要管理员权限' });
    }
    
    const userRoles = await db.query(
      'SELECT role, permissions FROM admin_roles WHERE user_id = ?',
      [req.userId]
    );
    
    if (userRoles.length === 0) {
      return res.status(403).json({ success: false, message: '权限不足' });
    }
    
    const userRole = userRoles[0];
    const superPerms = ['super_admin'];
    const managerPerms = ['super_admin', 'manager'];
    
    let allowedPerms;
    switch (userRole.role) {
      case 'super_admin':
        allowedPerms = superPerms;
        break;
      case 'manager':
        allowedPerms = managerPerms;
        break;
      default:
        allowedPerms = [userRole.role];
    }
    
    if (!allowedPerms.includes(permission)) {
      return res.status(403).json({ success: false, message: '权限不足' });
    }
    
    next();
  };
};

const regenerateSession = async (req, res, next) => {
  if (req.session) {
    req.session.regenerate((err) => {
      if (err) {
        return next(err);
      }
      const { v4: uuidv4 } = require('uuid');
      req.session.id = uuidv4();
      req.session.createdAt = Date.now();
      next();
    });
  } else {
    next();
  }
};

async function checkTokenValidity(token) {
  try {
    if (db.redis) {
      const exists = await db.redis.exists(`token:${token}`);
      return exists === 1;
    }
    return true;
  } catch (error) {
    logger.warn('Redis token check failed, allowing token:', error.message);
    return true;
  }
}

async function revokeToken(token) {
  try {
    if (db.redis) {
      await db.redis.del(`token:${token}`);
    }
    logger.info('Token revoked:', `${token.substring(0, 20)}...`);
    return true;
  } catch (error) {
    logger.error('Failed to revoke token:', error);
    return false;
  }
}

async function storeToken(token, userId) {
  try {
    if (db.redis) {
      const ttl = SESSION_EXPIRY_HOURS * 60 * 60;
      await db.redis.setEx(`token:${token}`, ttl, String(userId));
    }
    return true;
  } catch (error) {
    logger.error('Failed to store token:', error);
    return false;
  }
}

module.exports = {
  optionalAuth,
  requireAuth,
  requireAdmin,
  requirePermission,
  regenerateSession,
  revokeToken,
  storeToken,
  checkTokenValidity,
  TOKEN_EXPIRY,
  SESSION_EXPIRY_HOURS
};
