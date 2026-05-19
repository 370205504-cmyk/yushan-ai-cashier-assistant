const roleService = require('../services/roleService');

function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      const adminId = req.adminId || req.user?.id;
      if (!adminId) {
        return res.status(401).json({ success: false, message: '未授权' });
      }

      const hasPermission = await roleService.checkPermission(adminId, permission);
      if (!hasPermission) {
        return res.status(403).json({ success: false, message: '权限不足' });
      }

      next();
    } catch (error) {
      res.status(500).json({ success: false, message: '权限验证失败' });
    }
  };
}

function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      const adminId = req.adminId || req.user?.id;
      if (!adminId) {
        return res.status(401).json({ success: false, message: '未授权' });
      }

      const userRole = await roleService.getAdminRole(adminId);
      if (!userRole || !roles.includes(userRole)) {
        return res.status(403).json({ success: false, message: '角色权限不足' });
      }

      next();
    } catch (error) {
      res.status(500).json({ success: false, message: '角色验证失败' });
    }
  };
}

function requireSuperAdmin(req, res, next) {
  return requireRole('super_admin')(req, res, next);
}

function requireManager(req, res, next) {
  return requireRole('super_admin', 'manager')(req, res, next);
}

module.exports = {
  requirePermission,
  requireRole,
  requireSuperAdmin,
  requireManager
};
