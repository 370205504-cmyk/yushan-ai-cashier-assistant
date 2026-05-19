/**
 * MCP工具扩展 - 收银系统对接工具
 */

const { getAdapterManager } = require('../adapters');

class MCPTools {
  constructor() {
    this.manager = getAdapterManager();
  }

  /**
   * 获取收银菜品列表
   */
  async getDishes(category = null) {
    try {
      const adapter = this.manager.getActiveAdapter();
      if (!adapter) {
        return { success: false, error: '请先激活收银适配器' };
      }
      
      const dishes = await adapter.getDishes();
      let filtered = dishes;
      
      if (category) {
        filtered = dishes.filter(d => d.category === category);
      }
      
      return {
        success: true,
        count: filtered.length,
        dishes: filtered
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * 查询收银库存
   */
  async getInventory(dishId = null) {
    try {
      const adapter = this.manager.getActiveAdapter();
      if (!adapter) {
        return { success: false, error: '请先激活收银适配器' };
      }
      
      const inventory = await adapter.getInventory();
      
      if (dishId) {
        const item = inventory.find(i => i.dishId === dishId);
        return { success: true, item };
      }
      
      return {
        success: true,
        count: inventory.length,
        inventory
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * 同步订单到收银系统
   */
  async syncOrder(orderData) {
    try {
      const adapter = this.manager.getActiveAdapter();
      if (!adapter) {
        return { success: false, error: '请先激活收银适配器' };
      }
      
      const result = await adapter.createOrder(orderData);
      return {
        success: true,
        order: result,
        message: '订单已同步到收银系统'
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * 查询订单状态
   */
  async getOrderStatus(orderId) {
    try {
      const adapter = this.manager.getActiveAdapter();
      if (!adapter) {
        return { success: false, error: '请先激活收银适配器' };
      }
      
      const status = await adapter.syncPaymentStatus(orderId);
      return {
        success: true,
        ...status
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * 获取会员信息
   */
  async getMemberInfo(phone = null, memberId = null) {
    try {
      const adapter = this.manager.getActiveAdapter();
      if (!adapter) {
        return { success: false, error: '请先激活收银适配器' };
      }
      
      const members = await adapter.getMembers();
      
      if (phone) {
        const member = members.find(m => m.phone === phone);
        return { success: true, member };
      }
      
      if (memberId) {
        const member = members.find(m => m.id === memberId);
        return { success: true, member };
      }
      
      return {
        success: true,
        count: members.length,
        members
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * 获取可用的MCP工具列表
   */
  getToolsList() {
    return [
      {
        name: 'getDishes',
        description: '获取收银系统的菜品列表，支持按分类筛选',
        parameters: {
          type: 'object',
          properties: {
            category: { type: 'string', description: '分类名称（可选）' }
          }
        }
      },
      {
        name: 'getInventory',
        description: '查询收银系统的库存',
        parameters: {
          type: 'object',
          properties: {
            dishId: { type: 'string', description: '菜品ID（可选，不传则查全部）' }
          }
        }
      },
      {
        name: 'syncOrder',
        description: '同步订单到收银系统',
        parameters: {
          type: 'object',
          properties: {
            orderNo: { type: 'string', description: '订单号' },
            items: { type: 'array', description: '商品列表' },
            total: { type: 'number', description: '总金额' }
          },
          required: ['orderNo', 'items', 'total']
        }
      },
      {
        name: 'getOrderStatus',
        description: '查询订单状态',
        parameters: {
          type: 'object',
          properties: {
            orderId: { type: 'string', description: '订单ID' }
          },
          required: ['orderId']
        }
      },
      {
        name: 'getMemberInfo',
        description: '获取会员信息',
        parameters: {
          type: 'object',
          properties: {
            phone: { type: 'string', description: '手机号' },
            memberId: { type: 'string', description: '会员ID' }
          }
        }
      }
    ];
  }
}

module.exports = MCPTools;
