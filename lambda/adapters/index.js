/**
 * 雨姗 AI 收银助手 - 适配器管理器
 * 统一管理所有收银系统适配器
 */

const BaseAdapter = require('./base-adapter');

class AdapterManager {
  constructor() {
    this.adapters = new Map();
    this.activeAdapter = null;
    this.registerAllAdapters();
  }

  /**
   * 注册所有适配器
   */
  registerAllAdapters() {
    // 主流收银系统适配器
    const fs = require('fs');
    const path = require('path');
    const adaptersDir = __dirname;
    
    // 读取当前目录下的所有适配器文件（除了 base 和 index）
    const files = fs.readdirSync(adaptersDir);
    files.forEach(file => {
      if (file.endsWith('-adapter.js') && 
          !file.includes('base-adapter') && 
          !file.includes('index.js')) {
        try {
          const AdapterClass = require(path.join(adaptersDir, file));
          if (AdapterClass && AdapterClass.prototype instanceof BaseAdapter) {
            this.registerAdapter(AdapterClass);
            console.log(`✅ 已加载适配器: ${AdapterClass.name}`);
          }
        } catch (e) {
          console.error(`❌ 加载适配器失败 ${file}:`, e.message);
        }
      }
    });
  }

  /**
   * 注册一个适配器
   * @param {Class} AdapterClass 适配器类
   */
  registerAdapter(AdapterClass) {
    const name = AdapterClass.name;
    this.adapters.set(name, AdapterClass);
  }

  /**
   * 获取所有可用的适配器
   * @returns {Array} 适配器列表
   */
  getAvailableAdapters() {
    return Array.from(this.adapters.values()).map(AdapterClass => ({
      name: AdapterClass.name,
      configSchema: AdapterClass.getConfigSchema()
    }));
  }

  /**
   * 创建并激活一个适配器
   * @param {string} adapterName 适配器名称
   * @param {Object} config 配置
   * @returns {Promise<BaseAdapter>} 适配器实例
   */
  async activateAdapter(adapterName, config) {
    const AdapterClass = this.adapters.get(adapterName);
    if (!AdapterClass) {
      throw new Error(`适配器 ${adapterName} 不存在`);
    }

    const adapter = new AdapterClass(config);
    const connected = await adapter.connect();
    
    if (connected) {
      this.activeAdapter = adapter;
      console.log(`✅ 已激活适配器: ${adapterName}`);
      return adapter;
    } else {
      throw new Error(`适配器 ${adapterName} 连接失败`);
    }
  }

  /**
   * 获取当前激活的适配器
   * @returns {BaseAdapter|null}
   */
  getActiveAdapter() {
    return this.activeAdapter;
  }

  /**
   * 自动检测并选择合适的适配器
   * @param {Object} env 环境信息
   * @returns {Promise<BaseAdapter|null>}
   */
  async autoDetectAndActivate(env) {
    for (const [name, AdapterClass] of this.adapters) {
      try {
        const detected = await AdapterClass.detect(env);
        if (detected) {
          console.log(`🔍 自动检测到: ${name}`);
          return this.activateAdapter(name, {});
        }
      } catch (e) {
        console.error(`检测适配器 ${name} 失败:`, e.message);
      }
    }
    return null;
  }
}

// 单例模式
let instance = null;
function getAdapterManager() {
  if (!instance) {
    instance = new AdapterManager();
  }
  return instance;
}

module.exports = {
  AdapterManager,
  getAdapterManager,
  BaseAdapter
};
