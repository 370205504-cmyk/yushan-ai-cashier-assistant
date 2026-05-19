/**
 * 哗啦啦收银适配器
 */
const BaseAdapter = require('./base-adapter');

class HualalaAdapter extends BaseAdapter {
  constructor(config) {
    super(config);
    this.apiUrl = config.apiUrl || 'https://api.hualala.com';
  }

  async connect() {
    console.log('🔗 连接哗啦啦收银系统...');
    this.connected = true;
    return true;
  }

  async getDishes() {
    return [
      { id: 'hll-001', name: '糖醋里脊', price: 30, category: '热菜' },
      { id: 'hll-002', name: '清炒时蔬', price: 15, category: '蔬菜' }
    ];
  }

  async getInventory() {
    return [{ dishId: 'hll-001', stock: 30 }, { dishId: 'hll-002', stock: 150 }];
  }

  async getMembers() {
    return [{ id: 'hll-m1', name: '王五', phone: '13700137000', balance: 200 }];
  }

  async createOrder(orderData) {
    return { ...orderData, externalId: `hll-order-${Date.now()}`, status: 'created' };
  }

  async updateOrderStatus(orderId, status) { return true; }
  async syncPaymentStatus(orderId) { return { orderId, paid: true, paidAmount: 45, paymentMethod: 'cash' }; }

  static async detect(env) {
    return env.processes?.some(p => p.includes('hualala') || p.includes('哗啦啦'));
  }

  static getConfigSchema() {
    return [
      { name: 'merchantId', type: 'string', label: '商户ID', required: true },
      { name: 'secretKey', type: 'string', label: '密钥', required: true }
    ];
  }
}

module.exports = HualalaAdapter;
