/**
 * 美团收银适配器
 */
const BaseAdapter = require('./base-adapter');

class MeituanAdapter extends BaseAdapter {
  constructor(config) {
    super(config);
    this.apiUrl = config.apiUrl || 'https://waimaiopen.meituan.com';
    this.appKey = config.appKey;
    this.appSecret = config.appSecret;
  }

  async connect() {
    try {
      console.log('🔗 连接美团收银系统...');
      // 模拟连接验证
      this.connected = true;
      return true;
    } catch (e) {
      console.error('美团收银连接失败:', e);
      return false;
    }
  }

  async getDishes() {
    console.log('📋 获取美团收银菜品列表');
    return [
      { id: 'mt-001', name: '宫保鸡丁', price: 28, category: '热菜' },
      { id: 'mt-002', name: '鱼香肉丝', price: 26, category: '热菜' }
    ];
  }

  async getInventory() {
    return [
      { dishId: 'mt-001', stock: 100 },
      { dishId: 'mt-002', stock: 80 }
    ];
  }

  async getMembers() {
    return [
      { id: 'm-001', name: '张三', phone: '13800138000', balance: 500 }
    ];
  }

  async createOrder(orderData) {
    console.log('📝 写入美团收银订单:', orderData.orderNo);
    return {
      ...orderData,
      externalId: `mt-order-${Date.now()}`,
      status: 'created'
    };
  }

  async updateOrderStatus(orderId, status) {
    console.log(`🔄 更新美团订单 ${orderId} 状态为 ${status}`);
    return true;
  }

  async syncPaymentStatus(orderId) {
    return {
      orderId,
      paid: true,
      paidAmount: 54,
      paymentMethod: 'wechat'
    };
  }

  static async detect(env) {
    return env.processes?.some(p => p.includes('meituan') || p.includes('美团'));
  }

  static getConfigSchema() {
    return [
      { name: 'appKey', type: 'string', label: 'App Key', required: true },
      { name: 'appSecret', type: 'string', label: 'App Secret', required: true },
      { name: 'storeId', type: 'string', label: '门店ID' }
    ];
  }
}

module.exports = MeituanAdapter;
