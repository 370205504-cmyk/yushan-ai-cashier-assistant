const config = require('../config.json');

class CartService {
  constructor() {
    this.carts = new Map();
    this.loadCarts();
  }

  loadCarts() {
    try {
      const fs = require('fs');
      const path = require('path');
      const cartFile = path.join(__dirname, '..', 'data', 'carts.json');

      if (fs.existsSync(cartFile)) {
        const data = JSON.parse(fs.readFileSync(cartFile, 'utf-8'));
        this.carts = new Map(data);
      }
    } catch (error) {
      console.error('加载购物车数据失败:', error);
    }
  }

  saveCarts() {
    try {
      const fs = require('fs');
      const path = require('path');
      const cartFile = path.join(__dirname, '..', 'data', 'carts.json');

      const data = Array.from(this.carts.entries());
      fs.writeFileSync(cartFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('保存购物车数据失败:', error);
    }
  }

  getCart(userId) {
    if (!this.carts.has(userId)) {
      this.carts.set(userId, {
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    const cart = this.carts.get(userId);
    const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return {
      ...cart,
      total,
      itemCount: cart.items.length
    };
  }

  async addItem(userId, dishId, quantity = 1, remarks = '') {
    const dishes = require('../data/dishes.json');
    const dish = dishes.find(d => d.id == dishId || d.id === dishId);

    if (!dish) {
      throw new Error(`菜品不存在: ${dishId}`);
    }

    if (!this.carts.has(userId)) {
      this.carts.set(userId, {
        items: [],
        createdAt: new Date().toISOString()
      });
    }

    const cart = this.carts.get(userId);
    const existingIndex = cart.items.findIndex(item => item.dishId == dishId && item.remarks === remarks);

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += quantity;
    } else {
      cart.items.push({
        id: Date.now(),
        dishId: dish.id,
        name: dish.name,
        price: dish.price,
        priceUnit: dish.priceUnit || '元/份',
        quantity,
        remarks,
        addedAt: new Date().toISOString()
      });
    }

    cart.updatedAt = new Date().toISOString();
    this.saveCarts();

    return this.getCart(userId);
  }

  async removeItem(userId, dishId) {
    if (!this.carts.has(userId)) {
      return this.getCart(userId);
    }

    const cart = this.carts.get(userId);
    const itemIndex = cart.items.findIndex(item => item.dishId == dishId);

    if (itemIndex > -1) {
      cart.items.splice(itemIndex, 1);
      cart.updatedAt = new Date().toISOString();
      this.saveCarts();
    }

    return this.getCart(userId);
  }

  async updateItemQuantity(userId, dishId, quantity) {
    if (!this.carts.has(userId)) {
      throw new Error('购物车不存在');
    }

    const cart = this.carts.get(userId);
    const item = cart.items.find(item => item.dishId == dishId);

    if (!item) {
      throw new Error('购物车中没有此商品');
    }

    if (quantity <= 0) {
      return await this.removeItem(userId, dishId);
    }

    item.quantity = quantity;
    cart.updatedAt = new Date().toISOString();
    this.saveCarts();

    return this.getCart(userId);
  }

  async clearCart(userId) {
    if (this.carts.has(userId)) {
      this.carts.get(userId).items = [];
      this.carts.get(userId).updatedAt = new Date().toISOString();
      this.saveCarts();
    }

    return this.getCart(userId);
  }

  async addRemark(userId, dishId, remarks) {
    if (!this.carts.has(userId)) {
      throw new Error('购物车不存在');
    }

    const cart = this.carts.get(userId);
    const item = cart.items.find(item => item.dishId == dishId);

    if (!item) {
      throw new Error('购物车中没有此商品');
    }

    item.remarks = remarks;
    cart.updatedAt = new Date().toISOString();
    this.saveCarts();

    return this.getCart(userId);
  }
}

module.exports = new CartService();
