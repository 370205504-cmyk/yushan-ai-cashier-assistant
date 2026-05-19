/**
 * 实时数据增量监听
 * 监听收银数据库/接口，实时同步新订单/退单/改价/结账/库存变动
 */

class DataWatcher {
  constructor(adapter) {
    this.adapter = adapter;
    this.isWatching = false;
    this.watchInterval = null;
    this.lastSyncTime = null;
    this.changeLog = [];
    this.callbacks = {
      onNewOrder: [],
      onOrderUpdate: [],
      onOrderCancel: [],
      onPriceChange: [],
      onStockChange: [],
      onPayment: []
    };
  }

  /**
   * 开始监听
   */
  async startWatching(pollingInterval = 10000) {
    if (this.isWatching) {
      console.log('⚠️ 监听已在运行中');
      return;
    }

    console.log('🔍 开始实时数据增量监听...');
    this.isWatching = true;
    this.lastSyncTime = new Date();

    // 初始全量同步
    await this.initialSync();

    // 开始轮询
    this.watchInterval = setInterval(() => {
      this.pollForChanges();
    }, pollingInterval);

    console.log('✅ 实时监听已启动');
  }

  /**
   * 停止监听
   */
  stopWatching() {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }
    this.isWatching = false;
    console.log('⏹️ 实时监听已停止');
  }

  /**
   * 初始全量同步
   */
  async initialSync() {
    console.log('📦 初始全量同步...');
    try {
      const dishes = await this.adapter.getDishes();
      const inventory = await this.adapter.getInventory();
      const members = await this.adapter.getMembers();

      console.log(`   菜品: ${dishes?.length || 0} 个`);
      console.log(`   库存: ${inventory?.length || 0} 项`);
      console.log(`   会员: ${members?.length || 0} 个`);

      this.changeLog.push({
        type: 'INITIAL_SYNC',
        time: new Date().toISOString(),
        dishesCount: dishes?.length || 0,
        inventoryCount: inventory?.length || 0,
        membersCount: members?.length || 0
      });

      return { success: true, dishes, inventory, members };
    } catch (e) {
      console.error('❌ 初始同步失败:', e);
      return { success: false, error: e };
    }
  }

  /**
   * 轮询检查变更
   */
  async pollForChanges() {
    if (!this.adapter || !this.isWatching) return;

    try {
      const currentTime = new Date();
      const changes = await this.detectChanges(this.lastSyncTime, currentTime);

      if (changes.hasChanges) {
        console.log(`📋 检测到 ${changes.totalChanges} 个变更`);
        this.processChanges(changes);
      }

      this.lastSyncTime = currentTime;
    } catch (e) {
      console.error('❌ 轮询检查失败:', e);
    }
  }

  /**
   * 检测变更
   */
  async detectChanges(sinceTime, currentTime) {
    const changes = {
      hasChanges: false,
      totalChanges: 0,
      newOrders: [],
      updatedOrders: [],
      cancelledOrders: [],
      priceChanges: [],
      stockChanges: [],
      payments: []
    };

    try {
      // 检测新订单
      const orders = await this.getRecentOrders(sinceTime);
      if (orders && orders.length > 0) {
        changes.newOrders = orders;
        changes.totalChanges += orders.length;
      }

      // 检测库存变更
      const stockDiffs = await this.getStockChanges();
      if (stockDiffs && stockDiffs.length > 0) {
        changes.stockChanges = stockDiffs;
        changes.totalChanges += stockDiffs.length;
      }

      // 检测价格变更
      const priceDiffs = await this.getPriceChanges();
      if (priceDiffs && priceDiffs.length > 0) {
        changes.priceChanges = priceDiffs;
        changes.totalChanges += priceDiffs.length;
      }

      changes.hasChanges = changes.totalChanges > 0;
    } catch (e) {
      console.error('变更检测失败:', e);
    }

    return changes;
  }

  /**
   * 获取最近订单
   */
  async getRecentOrders(sinceTime) {
    // 在真实实现中，这里会调用适配器查询指定时间后的新订单
    // 这里返回模拟数据用于演示
    const randomOrders = [];

    if (Math.random() > 0.7) { // 30% 概率模拟有新订单
      const mockOrder = {
        id: `ORD-${Date.now()}`,
        orderNo: `ORD-${Date.now()}`,
        time: new Date().toISOString(),
        items: [
          { name: '宫保鸡丁', quantity: 1, price: 28 },
          { name: '米饭', quantity: 2, price: 2 }
        ],
        totalAmount: 32,
        status: 'NEW'
      };
      randomOrders.push(mockOrder);
    }

    return randomOrders;
  }

  /**
   * 获取库存变更
   */
  async getStockChanges() {
    const changes = [];

    if (Math.random() > 0.8) { // 20% 概率模拟库存变更
      changes.push({
        dishId: 'dish-001',
        dishName: '宫保鸡丁',
        oldStock: 100,
        newStock: 98,
        change: -2,
        time: new Date().toISOString()
      });
    }

    return changes;
  }

  /**
   * 获取价格变更
   */
  async getPriceChanges() {
    const changes = [];

    if (Math.random() > 0.95) { // 5% 概率模拟价格变更
      changes.push({
        dishId: 'dish-002',
        dishName: '鱼香肉丝',
        oldPrice: 26,
        newPrice: 28,
        time: new Date().toISOString()
      });
    }

    return changes;
  }

  /**
   * 处理变更事件
   */
  processChanges(changes) {
    this.changeLog.push({
      time: new Date().toISOString(),
      ...changes
    });

    // 触发新订单回调
    if (changes.newOrders.length > 0) {
      this.triggerCallbacks('onNewOrder', changes.newOrders);
    }

    // 触发订单更新回调
    if (changes.updatedOrders.length > 0) {
      this.triggerCallbacks('onOrderUpdate', changes.updatedOrders);
    }

    // 触发订单取消回调
    if (changes.cancelledOrders.length > 0) {
      this.triggerCallbacks('onOrderCancel', changes.cancelledOrders);
    }

    // 触发价格变更回调
    if (changes.priceChanges.length > 0) {
      this.triggerCallbacks('onPriceChange', changes.priceChanges);
    }

    // 触发库存变更回调
    if (changes.stockChanges.length > 0) {
      this.triggerCallbacks('onStockChange', changes.stockChanges);
    }

    // 触发支付回调
    if (changes.payments.length > 0) {
      this.triggerCallbacks('onPayment', changes.payments);
    }
  }

  /**
   * 注册事件回调
   */
  on(eventName, callback) {
    if (this.callbacks[eventName]) {
      this.callbacks[eventName].push(callback);
    }
  }

  /**
   * 触发所有回调
   */
  triggerCallbacks(eventName, data) {
    this.callbacks[eventName].forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        console.error(`回调执行失败 [${eventName}]:`, e);
      }
    });
  }

  /**
   * 获取变更日志
   */
  getChangeLog(limit = 50) {
    return this.changeLog.slice(-limit);
  }

  /**
   * 获取监听状态
   */
  getStatus() {
    return {
      isWatching: this.isWatching,
      lastSyncTime: this.lastSyncTime,
      changeCount: this.changeLog.length,
      uptime: this.isWatching ? 
        Math.floor((Date.now() - this.lastSyncTime.getTime()) / 1000) : 0
    };
  }
}

module.exports = DataWatcher;
