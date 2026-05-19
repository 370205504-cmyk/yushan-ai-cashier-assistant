/**
 * 思迅收银适配器
 */
const BaseAdapter = require('./base-adapter');

class SixunAdapter extends BaseAdapter {
  constructor(config) { super(config); }
  async connect() { console.log('🔗 连接思迅收银...'); this.connected = true; return true; }
  async getDishes() { return [{ id: 'sx-001', name: '水煮鱼', price: 58, category: '热菜' }]; }
  async getInventory() { return [{ dishId: 'sx-001', stock: 20 }]; }
  async getMembers() { return []; }
  async createOrder(orderData) { return { ...orderData, externalId: `sx-order-${Date.now()}` }; }
  async updateOrderStatus(orderId, status) { return true; }
  async syncPaymentStatus(orderId) { return { orderId, paid: true, paidAmount: 58 }; }
  static async detect(env) { return env.processes?.some(p => p.includes('sixun') || p.includes('思迅')); }
  static getConfigSchema() { return [{ name: 'dbHost', type: 'string', label: '数据库地址', required: true }]; }
}

module.exports = SixunAdapter;
