/**
 * 双向数据同步引擎
 * 增量同步、冲突解决、数据校验、防错机制
 */

class SyncEngine {
  constructor(adapter) {
    this.adapter = adapter;
    this.localOrders = new Map();
    this.remoteOrders = new Map();
    this.syncHistory = [];
    this.isRunning = false;
    this.syncInterval = null;
  }

  /**
   * 启动同步引擎
   */
  start(intervalMs = 30000) {
    if (this.isRunning) return;
    
    console.log('🔄 启动数据同步引擎...');
    this.isRunning = true;
    
    // 立即同步一次
    this.fullSync();
    
    // 定时同步
    this.syncInterval = setInterval(() => {
      this.incrementalSync();
    }, intervalMs);
  }

  /**
   * 停止同步
   */
  stop() {
    this.isRunning = false;
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    console.log('⏹️  同步引擎已停止');
  }

  /**
   * 全量同步
   */
  async fullSync() {
    console.log('📦 执行全量同步...');
    try {
      // 获取远程数据
      const dishes = await this.adapter.getDishes();
      const inventory = await this.adapter.getInventory();
      const members = await this.adapter.getMembers();
      
      // 本地存储
      this.syncHistory.push({
        type: 'full',
        timestamp: new Date().toISOString(),
        items: { dishes, inventory, members }
      });
      
      console.log(`✅ 全量同步完成: ${dishes.length} 个菜品, ${inventory.length} 个库存项`);
      return { success: true, dishes, inventory, members };
    } catch (e) {
      console.error('❌ 全量同步失败:', e);
      return { success: false, error: e.message };
    }
  }

  /**
   * 增量同步
   */
  async incrementalSync() {
    console.log('📊 执行增量同步...');
    const changes = [];
    
    try {
      // 1. 推送本地新订单到远程
      for (const [id, order] of this.localOrders) {
        if (!order.synced) {
          await this.pushOrder(order);
          order.synced = true;
          changes.push({ type: 'push', id });
        }
      }
      
      // 2. 拉取远程更新
      // (模拟)
      
      this.syncHistory.push({
        type: 'incremental',
        timestamp: new Date().toISOString(),
        changes
      });
      
      if (changes.length > 0) {
        console.log(`✅ 增量同步完成: ${changes.length} 个变更`);
      }
      return { success: true, changes };
    } catch (e) {
      console.error('❌ 增量同步失败:', e);
      return { success: false, error: e.message };
    }
  }

  /**
   * 推送订单到收银系统
   */
  async pushOrder(order) {
    console.log(`📤 推送订单: ${order.orderNo}`);
    try {
      const result = await this.adapter.createOrder(order);
      order.externalId = result.externalId;
      return result;
    } catch (e) {
      console.error(`❌ 订单推送失败 ${order.orderNo}:`, e);
      throw e;
    }
  }

  /**
   * 添加本地订单
   */
  addLocalOrder(order) {
    order.id = order.id || `local_${Date.now()}`;
    order.synced = false;
    order.createdAt = new Date().toISOString();
    this.localOrders.set(order.id, order);
    console.log(`📝 添加本地订单: ${order.orderNo}`);
    return order;
  }

  /**
   * 解决冲突（Last Write Wins 策略）
   */
  resolveConflict(local, remote) {
    const localTime = new Date(local.updatedAt || local.createdAt);
    const remoteTime = new Date(remote.updatedAt || remote.createdAt);
    
    if (localTime > remoteTime) {
      return { winner: 'local', data: local };
    } else {
      return { winner: 'remote', data: remote };
    }
  }

  /**
   * 验证数据完整性
   */
  validateData(data) {
    const errors = [];
    
    if (!data.orderNo) {
      errors.push('缺少订单号');
    }
    if (!data.items || data.items.length === 0) {
      errors.push('订单无商品');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取同步状态
   */
  getStatus() {
    return {
      running: this.isRunning,
      lastSync: this.syncHistory[this.syncHistory.length - 1]?.timestamp || null,
      pendingOrders: Array.from(this.localOrders.values()).filter(o => !o.synced).length,
      historyCount: this.syncHistory.length
    };
  }

  /**
   * 获取同步历史
   */
  getHistory(limit = 50) {
    return this.syncHistory.slice(-limit);
  }
}

module.exports = SyncEngine;
