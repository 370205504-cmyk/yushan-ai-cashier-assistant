class CashierAdapter {
  constructor() {
    this.config = require('../config.json');
    this.connected = false;
  }

  async connect() {
    if (!this.config.cashier?.enabled) {
      console.log('收银系统未启用');
      return false;
    }

    const provider = this.config.cashier.provider;

    switch (provider) {
      case 'yinbao':
        await this.connectYinbao();
        break;
      case 'meituan':
        await this.connectMeituan();
        break;
      case 'keruyun':
        await this.connectKeruyun();
        break;
      default:
        console.log(`未知的收银系统: ${provider}`);
        return false;
    }

    this.connected = true;
    console.log(`已连接收银系统: ${provider}`);
    return true;
  }

  async connectYinbao() {
    console.log('连接银豹收银系统...');
  }

  async connectMeituan() {
    console.log('连接美团收银系统...');
  }

  async connectKeruyun() {
    console.log('连接客如云收银系统...');
  }

  async syncDishes() {
    if (!this.connected) {
      await this.connect();
    }

    const dishesService = require('../services/dishesService');
    const dishes = dishesService.getAllDishes();

    console.log(`同步 ${dishes.length} 道菜品到收银系统`);

    return {
      success: true,
      syncedCount: dishes.length
    };
  }

  async pushOrder(order) {
    if (!this.connected) {
      await this.connect();
    }

    const provider = this.config.cashier.provider;

    switch (provider) {
      case 'yinbao':
        return await this.pushOrderToYinbao(order);
      case 'meituan':
        return await this.pushOrderToMeituan(order);
      case 'keruyun':
        return await this.pushOrderToKeruyun(order);
      default:
        throw new Error(`不支持的收银系统: ${provider}`);
    }
  }

  async pushOrderToYinbao(order) {
    const cashierOrder = {
      orderId: order.orderId,
      items: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount: order.totalAmount,
      tableNo: order.tableNo,
      remarks: order.remarks
    };

    console.log('推送订单到银豹:', cashierOrder);

    return {
      success: true,
      cashierOrderId: `YB${order.orderId}`
    };
  }

  async pushOrderToMeituan(order) {
    const cashierOrder = {
      orderId: order.orderId,
      items: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount: order.totalAmount
    };

    console.log('推送订单到美团:', cashierOrder);

    return {
      success: true,
      cashierOrderId: `MT${order.orderId}`
    };
  }

  async pushOrderToKeruyun(order) {
    const cashierOrder = {
      orderId: order.orderId,
      items: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount: order.totalAmount
    };

    console.log('推送订单到客如云:', cashierOrder);

    return {
      success: true,
      cashierOrderId: `KRY${order.orderId}`
    };
  }

  async syncInventory(dishId, quantity) {
    if (!this.connected) {
      return { success: false, message: '收银系统未连接' };
    }

    console.log(`同步库存: ${dishId} - ${quantity}`);

    return { success: true };
  }

  async queryMember(phone) {
    if (!this.connected) {
      return null;
    }

    console.log(`查询会员: ${phone}`);

    return null;
  }

  async applyCoupon(memberId, couponCode) {
    if (!this.connected) {
      return { success: false, message: '收银系统未连接' };
    }

    console.log(`应用优惠券: ${couponCode} for member: ${memberId}`);

    return { success: true, discount: 0 };
  }
}

module.exports = new CashierAdapter();
