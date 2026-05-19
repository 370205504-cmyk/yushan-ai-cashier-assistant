/**
 * 雨姗 AI 收银助手 - 收银系统适配器基类
 * 所有收银系统适配器都必须继承并实现这个类
 */

class BaseAdapter {
  constructor(config = {}) {
    this.config = config;
    this.name = this.constructor.name;
    this.connected = false;
  }

  /**
   * 连接到收银系统
   * @returns {Promise<boolean>} 是否连接成功
   */
  async connect() {
    throw new Error('connect() must be implemented by subclass');
  }

  /**
   * 断开连接
   */
  async disconnect() {
    this.connected = false;
  }

  /**
   * 检查连接状态
   * @returns {boolean} 是否连接
   */
  isConnected() {
    return this.connected;
  }

  /**
   * 获取适配器名称
   */
  getName() {
    return this.name;
  }

  /**
   * 获取菜品列表
   * @returns {Promise<Array>} 菜品列表
   */
  async getDishes() {
    throw new Error('getDishes() must be implemented by subclass');
  }

  /**
   * 获取库存数据
   * @returns {Promise<Array>} 库存列表
   */
  async getInventory() {
    throw new Error('getInventory() must be implemented by subclass');
  }

  /**
   * 获取会员列表
   * @returns {Promise<Array>} 会员列表
   */
  async getMembers() {
    throw new Error('getMembers() must be implemented by subclass');
  }

  /**
   * 创建订单
   * @param {Object} orderData 订单数据
   * @returns {Promise<Object>} 创建的订单
   */
  async createOrder(orderData) {
    throw new Error('createOrder() must be implemented by subclass');
  }

  /**
   * 更新订单状态
   * @param {string} orderId 订单ID
   * @param {string} status 新状态
   * @returns {Promise<boolean>} 是否成功
   */
  async updateOrderStatus(orderId, status) {
    throw new Error('updateOrderStatus() must be implemented by subclass');
  }

  /**
   * 同步支付状态
   * @param {string} orderId 订单ID
   * @returns {Promise<Object>} 支付状态
   */
  async syncPaymentStatus(orderId) {
    throw new Error('syncPaymentStatus() must be implemented by subclass');
  }

  /**
   * 检测是否支持该收银系统
   * @param {Object} env 环境信息
   * @returns {Promise<boolean>} 是否支持
   */
  static async detect(env) {
    return false;
  }

  /**
   * 获取配置项描述（用于自动配置）
   * @returns {Array} 配置项描述
   */
  static getConfigSchema() {
    return [];
  }
}

module.exports = BaseAdapter;
