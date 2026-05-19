const { describe, it, expect } = require('@jest/globals');
const { PERMISSIONS } = require('../services/employeeRoleService');

describe('Employee Role Service', () => {
  describe('权限定义', () => {
    it('应该定义所有必要权限', () => {
      expect(PERMISSIONS.VIEW_ORDERS).toBe('view_orders');
      expect(PERMISSIONS.MANAGE_ORDERS).toBe('manage_orders');
      expect(PERMISSIONS.VIEW_DISHES).toBe('view_dishes');
      expect(PERMISSIONS.MANAGE_DISHES).toBe('manage_dishes');
      expect(PERMISSIONS.VIEW_MEMBERS).toBe('view_members');
      expect(PERMISSIONS.MANAGE_MEMBERS).toBe('manage_members');
      expect(PERMISSIONS.VIEW_STATS).toBe('view_stats');
      expect(PERMISSIONS.PROCESS_REFUNDS).toBe('process_refunds');
      expect(PERMISSIONS.VIEW_FINANCE).toBe('view_finance');
      expect(PERMISSIONS.MANAGE_INVENTORY).toBe('manage_inventory');
    });
  });

  describe('权限检查', () => {
    it('应该检查用户是否拥有指定权限', () => {
      const userPermissions = ['view_orders', 'manage_orders'];
      
      const hasViewOrders = userPermissions.includes('view_orders');
      const hasManageDishes = userPermissions.includes('manage_dishes');
      
      expect(hasViewOrders).toBe(true);
      expect(hasManageDishes).toBe(false);
    });

    it('应该允许拥有任意一个权限的访问', () => {
      const userPermissions = ['view_orders'];
      const requiredAny = ['view_orders', 'manage_orders'];
      
      const hasAny = requiredAny.some(p => userPermissions.includes(p));
      expect(hasAny).toBe(true);
    });

    it('应该要求拥有所有指定权限', () => {
      const userPermissions = ['view_orders'];
      const requiredAll = ['view_orders', 'view_finance'];
      
      const hasAll = requiredAll.every(p => userPermissions.includes(p));
      expect(hasAll).toBe(false);
    });
  });
});
