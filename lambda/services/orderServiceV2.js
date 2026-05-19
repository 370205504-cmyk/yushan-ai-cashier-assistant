const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const OrderStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

class OrderServiceV2 {
  constructor() {
    this.orders = new Map();
    this.orderFile = path.join(__dirname, '..', 'data', 'orders.json');
    this.loadOrders();
  }

  loadOrders() {
    try {
      if (fs.existsSync(this.orderFile)) {
        const data = JSON.parse(fs.readFileSync(this.orderFile, 'utf-8'));
        this.orders = new Map(data);
      }
    } catch (error) {
      logger.error('加载订单数据失败', { error: error.message });
    }
  }

  saveOrders() {
    try {
      const data = Array.from(this.orders.entries());
      fs.writeFileSync(this.orderFile, JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error('保存订单数据失败', { error: error.message });
    }
  }

  generateOrderId() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD${dateStr}${random}`;
  }

  async createOrder({ userId, storeId, tableNo, remarks, contactPhone }) {
    const cartService = require('./cartService');
    const cart = await cartService.getCart(userId);

    if (!cart.items || cart.items.length === 0) {
      throw new Error('购物车为空，无法创建订单');
    }

    const orderId = this.generateOrderId();
    const now = new Date();

    const order = {
      orderId,
      userId,
      storeId: storeId || 'default',
      tableNo: tableNo || '',
      contactPhone: contactPhone || '',
      items: cart.items,
      totalAmount: cart.total,
      status: OrderStatus.PENDING,
      remarks: remarks || '',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      statusHistory: [
        {
          status: OrderStatus.PENDING,
          timestamp: now.toISOString(),
          note: '订单已创建'
        }
      ]
    };

    this.orders.set(orderId, order);
    this.saveOrders();

    logger.logOrder(orderId, '订单创建', {
      userId,
      totalAmount: order.totalAmount,
      itemCount: cart.items.length
    });

    await cartService.clearCart(userId);

    return order;
  }

  async getOrder(orderId) {
    return this.orders.get(orderId) || null;
  }

  async updateOrderStatus(orderId, status, note = '') {
    const order = this.orders.get(orderId);

    if (!order) {
      throw new Error('订单不存在');
    }

    if (!Object.values(OrderStatus).includes(status)) {
      throw new Error('无效的订单状态');
    }

    const now = new Date();
    order.status = status;
    order.updatedAt = now.toISOString();
    order.statusHistory.push({
      status,
      timestamp: now.toISOString(),
      note: note || this.getStatusNote(status)
    });

    this.saveOrders();

    logger.logOrder(orderId, '订单状态更新', { status, note });

    return order;
  }

  getStatusNote(status) {
    const notes = {
      [OrderStatus.PENDING]: '等待确认',
      [OrderStatus.CONFIRMED]: '已确认，等待制作',
      [OrderStatus.PREPARING]: '正在制作中',
      [OrderStatus.READY]: '已制作完成',
      [OrderStatus.COMPLETED]: '订单已完成',
      [OrderStatus.CANCELLED]: '订单已取消'
    };
    return notes[status] || '';
  }

  async getOrders({ userId, status, page = 1, limit = 20 }) {
    let orders = Array.from(this.orders.values());

    if (userId) {
      orders = orders.filter(order => order.userId === userId);
    }

    if (status) {
      orders = orders.filter(order => order.status === status);
    }

    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = orders.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedOrders = orders.slice(start, end);

    return {
      orders: paginatedOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async cancelOrder(orderId) {
    return await this.updateOrderStatus(orderId, OrderStatus.CANCELLED, '用户取消订单');
  }

  async confirmOrder(orderId) {
    return await this.updateOrderStatus(orderId, OrderStatus.CONFIRMED, '订单已确认');
  }

  async startPreparing(orderId) {
    return await this.updateOrderStatus(orderId, OrderStatus.PREPARING, '开始制作');
  }

  async markReady(orderId) {
    return await this.updateOrderStatus(orderId, OrderStatus.READY, '制作完成，等待取餐');
  }

  async completeOrder(orderId) {
    return await this.updateOrderStatus(orderId, OrderStatus.COMPLETED, '订单已完成');
  }
}

module.exports = new OrderServiceV2();
