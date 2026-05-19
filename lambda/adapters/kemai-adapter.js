/**
 * 科脉收银适配器
 */
const BaseAdapter = require('./base-adapter');

class KemaiAdapter extends BaseAdapter {
  constructor(config) { super(config); }
  async connect() { console.log('🔗 连接科脉收银...'); this.connected = true; return true; }
  async getDishes() { return [{ id: 'km-001', name: '烤鸭', price: 88, category: '招牌' }]; }
  async getInventory() { return [{ dishId: 'km-001', stock: 15 }]; }
  async getMembers() { return []; }
  async createOrder(orderData) { return { ...orderData, externalId: `km-order-${Date.now()}` }; }
  async updateOrderStatus(orderId, status) { return true; }
  async syncPaymentStatus(orderId) { return { orderId, paid: true, paidAmount: 88 }; }
  static async detect(env) { return env.processes?.some(p => p.includes('kemai') || p.includes('科脉')); }
  static getConfigSchema() { return [{ name: 'apiKey', type: 'string', label: 'API Key', required: true }]; }
}

module.exports = KemaiAdapter;
