const fs = require('fs');
const path = require('path');

class OrderService {
  constructor() {
    this.orders = new Map();
    this.orderCounter = 1000;
    this.deliveryFee = 5;
    this.minFreeDeliveryAmount = 50;
  }

  /**
   * 从数据库获取最新菜品价格
   * @param {string} dishId - 菜品ID
   * @returns {Promise<number|null>} 菜品价格
   */
  async getDishPriceFromDb(dishId) {
    try {
      const db = require('../database/db');
      const dishes = await db.query('SELECT price FROM dishes WHERE id = ?', [dishId]);
      if (dishes.length > 0) {
        return dishes[0].price;
      }
      return null;
    } catch (error) {
      console.error(`获取菜品价格失败: ${dishId}`, error);
      return null;
    }
  }

  /**
   * 验证订单价格是否被篡改
   * @param {Array} orderItems - 订单项
   * @returns {Promise<Object>} 验证结果
   */
  async validateOrderPrices(orderItems) {
    const validationResults = [];
    
    for (const item of orderItems) {
      const currentPrice = await this.getDishPriceFromDb(item.dishId);
      
      if (currentPrice === null) {
        return {
          valid: false,
          error: `菜品不存在: ${item.dishId}`
        };
      }

      const expectedSubtotal = currentPrice * item.quantity;
      if (item.subtotal !== expectedSubtotal) {
        return {
          valid: false,
          error: `价格篡改检测: ${item.dishName} 的小计金额不匹配`,
          dishId: item.dishId,
          expectedPrice: currentPrice,
          receivedPrice: item.unitPrice,
          expectedSubtotal: expectedSubtotal,
          receivedSubtotal: item.subtotal
        };
      }

      validationResults.push({
        dishId: item.dishId,
        unitPrice: currentPrice,
        subtotal: expectedSubtotal
      });
    }

    return { valid: true, validatedItems: validationResults };
  }

  /**
   * 创建订单
   * @param {Object} orderData - 订单数据
   * @param {Object} orderData.dish - 菜品对象
   * @param {number} orderData.quantity - 数量
   * @param {string} orderData.address - 配送地址
   * @param {string} orderData.customerPhone - 客户电话
   * @param {string} orderData.storeId - 门店ID
   * @returns {Object} 订单结果
   */
  async createOrder(orderData) {
    const { dish, quantity, address, customerPhone, storeId } = orderData;

    if (!dish || !dish.id) {
      throw new Error('无效的菜品数据');
    }

    const currentPrice = await this.getDishPriceFromDb(dish.id);
    if (currentPrice === null) {
      throw new Error('菜品不存在');
    }

    if (dish.price !== currentPrice) {
      throw new Error('菜品价格已变更，请刷新后重试');
    }

    const orderId = this.generateOrderId();
    const subtotal = currentPrice * quantity;
    const deliveryFeeFinal = subtotal >= this.minFreeDeliveryAmount ? 0 : this.deliveryFee;
    const totalPrice = subtotal + deliveryFeeFinal;

    const order = {
      orderId: orderId,
      dish: dish,
      dishName: dish.name,
      quantity: quantity,
      subtotal: subtotal,
      deliveryFee: deliveryFeeFinal,
      totalPrice: totalPrice,
      address: address,
      customerPhone: customerPhone,
      storeId: storeId,
      status: 'pending', // pending, confirmed, preparing, delivering, completed, cancelled
      createdAt: new Date().toISOString(),
      estimatedDeliveryTime: this.estimateDeliveryTime(address)
    };

    this.orders.set(orderId, order);
    this.saveOrderToDatabase(order);

    return order;
  }

  /**
   * 生成订单ID
   * @returns {string} 订单ID
   */
  generateOrderId() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const counter = String(this.orderCounter++).padStart(4, '0');
    return `XY${dateStr}${counter}`;
  }

  /**
   * 估算配送时间
   * @param {string} address - 配送地址
   * @returns {number} 预计配送时间（分钟）
   */
  estimateDeliveryTime(address) {
    // 简化逻辑：基于地址长度估算
    const baseTime = 30; // 基础配送时间
    const addressFactor = Math.min(address.length / 20, 1) * 15; // 最多增加15分钟
    return Math.round(baseTime + addressFactor);
  }

  /**
   * 获取订单
   * @param {string} orderId - 订单ID
   * @returns {Object|null} 订单对象
   */
  getOrder(orderId) {
    return this.orders.get(orderId) || null;
  }

  /**
   * 更新订单状态
   * @param {string} orderId - 订单ID
   * @param {string} newStatus - 新状态
   * @returns {Object|null} 更新后的订单
   */
  updateOrderStatus(orderId, newStatus) {
    const order = this.orders.get(orderId);
    if (!order) {
      return null;
    }

    order.status = newStatus;
    order.updatedAt = new Date().toISOString();

    this.saveOrderToDatabase(order);
    return order;
  }

  /**
   * 取消订单
   * @param {string} orderId - 订单ID
   * @returns {boolean} 是否成功
   */
  cancelOrder(orderId) {
    const order = this.orders.get(orderId);
    if (!order) {
      return false;
    }

    // 只有待确认或已确认的订单可以取消
    if (['pending', 'confirmed'].includes(order.status)) {
      order.status = 'cancelled';
      order.cancelledAt = new Date().toISOString();
      this.saveOrderToDatabase(order);
      return true;
    }

    return false;
  }

  /**
   * 获取用户的所有订单
   * @param {string} customerPhone - 客户电话
   * @returns {Array} 订单列表
   */
  getOrdersByCustomer(customerPhone) {
    const customerOrders = [];
    this.orders.forEach(order => {
      if (order.customerPhone === customerPhone) {
        customerOrders.push(order);
      }
    });
    return customerOrders.sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  /**
   * 模拟保存到数据库
   * @param {Object} order - 订单对象
   */
  saveOrderToDatabase(order) {
    // 实际应用中这里会调用 DynamoDB 或其他数据库
    console.log(`[OrderService] 保存订单 ${order.orderId} 到数据库`);
  }
}

module.exports = OrderService;
