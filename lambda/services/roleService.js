const db = require('../database/db');

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  MANAGER: 'manager',
  CASHIER: 'cashier'
};

const PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: ['*'],
  [ROLES.MANAGER]: [
    'order:view', 'order:update', 'order:cancel',
    'dish:view', 'dish:create', 'dish:update', 'dish:delete',
    'stats:view', 'settings:view', 'settings:update'
  ],
  [ROLES.CASHIER]: [
    'order:view', 'order:update', 'order:confirm', 'order:print'
  ]
};

class RoleService {
  async getAdminRole(adminId) {
    const admins = await db.query('SELECT role FROM admins WHERE id = ?', [adminId]);
    return admins.length > 0 ? admins[0].role : null;
  }

  hasPermission(role, requiredPermission) {
    const permissions = PERMISSIONS[role];
    if (!permissions) {
      return false;
    }
    if (permissions.includes('*')) {
      return true;
    }
    return permissions.includes(requiredPermission);
  }

  async checkPermission(adminId, requiredPermission) {
    const role = await this.getAdminRole(adminId);
    if (!role) {
      return false;
    }
    return this.hasPermission(role, requiredPermission);
  }

  async getAdminPermissions(adminId) {
    const role = await this.getAdminRole(adminId);
    return PERMISSIONS[role] || [];
  }

  async assignRole(adminId, role) {
    if (!ROLES[role.toUpperCase()]) {
      throw new Error('无效的角色');
    }
    await db.query('UPDATE admins SET role = ? WHERE id = ?', [role, adminId]);
    return true;
  }
}

module.exports = new RoleService();
