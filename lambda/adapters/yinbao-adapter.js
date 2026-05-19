/**
 * 银豹收银适配器
 */
const BaseAdapter = require('./base-adapter');

class YinbaoAdapter extends BaseAdapter {
  constructor(config) {
    super(config);
    this.apiUrl = config.apiUrl || 'https://pospal.cn';
    this.appId = config.appId;
    this.appKey = config.appKey;
  }

  async connect() {
    console.log('🔗 连接银豹收银系统...');
    this.connected = true;
    return true;
  }

  async getDishes() {
    return [
      { id: 'yb-001', name: '红烧肉', price: 32, category: '热菜' },
      { id: 'yb-002', name: '麻婆豆腐', price: 18, category: '热菜' }
    ];
  }

  async getInventory() {
    return [{ dishId: 'yb-001', stock: 50 }, { dishId: 'yb-002', stock: 200 }];
  }

  async getMembers() {
    return [{ id: 'yb-m1', name: '李四', phone: '13900139000', balance: 1000 }];
  }

  async createOrder(orderData) {
    return {
      ...orderData,
      externalId: `yb-order-${Date.now()}`,
      status: 'created'
    };
  }

  async updateOrderStatus(orderId, status) {
    return true;
  }

  async syncPaymentStatus(orderId) {
    return { orderId, paid: true, paidAmount: 50, paymentMethod: 'alipay' };
  }

  static async detect(env) {
    return env.processes?.some(p => p.includes('yinbao') || p.includes('银豹'));
  }

  static getConfigSchema() {
    return [
      { name: 'appId', type: 'string', label: 'App ID', required: true },
      { name: 'appKey', type: 'string', label: 'App Key', required: true }
    ];
  }
}

module.exports = YinbaoAdapter;
