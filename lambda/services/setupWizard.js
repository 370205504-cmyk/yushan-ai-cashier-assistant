/**
 * 配置向导服务 v5.0.0
 * 引导商家完成收银对接、二维码生成、打印机配置
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

class SetupWizardService {
  constructor() {
    this.configPath = path.join(__dirname, '..', 'config', 'setup.json');
    this.config = this.loadConfig();
  }

  // 生成随机密码
  generateRandomPassword(length = 12) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    const array = new Uint32Array(length);
    crypto.randomFillSync(array);
    for (let i = 0; i < length; i++) {
      password += charset[array[i] % charset.length];
    }
    return password;
  }

  // 检查是否需要初始化管理员
  async needsAdminInitialization() {
    try {
      const adminExists = await this.checkAdminExists();
      return !adminExists;
    } catch (error) {
      console.error('检查管理员状态失败:', error);
      return true;
    }
  }

  // 检查管理员是否存在
  async checkAdminExists() {
    // 这里应该连接数据库检查，但为了简化，我们先检查配置文件
    return this.config.adminInitialized === true;
  }

  // 初始化管理员账号
  async initializeAdmin() {
    const password = this.generateRandomPassword();
    
    // 记录管理员初始化状态
    this.config.adminInitialized = true;
    this.config.adminCreatedAt = new Date().toISOString();
    this.saveConfig();

    return {
      success: true,
      username: 'admin',
      password: password,
      message: '管理员账号已创建，请立即修改密码'
    };
  }

  // 获取初始化状态
  getInitializationStatus() {
    return {
      adminInitialized: this.config.adminInitialized === true,
      adminCreatedAt: this.config.adminCreatedAt || null
    };
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
    } catch (e) {
      console.error('加载配置失败:', e);
    }
    return {
      setupComplete: false,
      currentStep: 1,
      cashierSystem: null,
      printerConfig: null,
      qrCodes: [],
      storeInfo: {
        name: '',
        address: '',
        phone: ''
      }
    };
  }

  saveConfig() {
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      return true;
    } catch (e) {
      console.error('保存配置失败:', e);
      return false;
    }
  }

  // 步骤1: 检测本地收银系统
  async step1Detect() {
    const detected = {
      systems: [],
      databases: [],
      printers: []
    };

    // 模拟检测收银系统
    const cashierSystems = ['meituan', 'yinbao', 'hualala', 'sixun', 'kemai'];
    for (const sys of cashierSystems) {
      if (this.simulateCheck(sys)) {
        detected.systems.push({
          id: sys,
          name: this.getCashierName(sys),
          detected: true
        });
      }
    }

    // 模拟检测数据库
    detected.databases = [
      { type: 'mysql', port: 3306, available: true },
      { type: 'mysql', port: 13306, available: true }
    ];

    // 模拟检测打印机
    detected.printers = [
      { name: '80mm热敏打印机', type: 'escpos', available: true },
      { name: '58mm小票打印机', type: 'escpos', available: true }
    ];

    return { success: true, detected };
  }

  simulateCheck(sysId) {
    return Math.random() > 0.5; // 随机模拟检测到
  }

  getCashierName(id) {
    const names = {
      meituan: '美团收银',
      yinbao: '银豹',
      hualala: '哗啦啦',
      sixun: '思迅',
      kemai: '科脉'
    };
    return names[id] || id;
  }

  // 步骤2: 配置收银系统
  async step2ConfigureCashier(cashierConfig) {
    this.config.cashierSystem = {
      type: cashierConfig.type,
      mode: 'read', // 默认只读模式
      connection: cashierConfig.connection,
      configuredAt: new Date().toISOString()
    };
    this.config.currentStep = 2;
    this.saveConfig();

    return { success: true };
  }

  // 步骤3: 生成二维码
  async step3GenerateQRCode(qrConfig) {
    const qrCodes = [];

    // 生成通用店铺码
    qrCodes.push({
      id: 'store',
      type: 'store',
      name: '店铺码',
      url: `https://order.yushan.ai/store/${qrConfig.storeId}`,
      generatedAt: new Date().toISOString()
    });

    // 生成桌码
    const tableCount = qrConfig.tableCount || 10;
    for (let i = 1; i <= tableCount; i++) {
      qrCodes.push({
        id: `table_${i}`,
        type: 'table',
        tableNumber: i,
        name: `桌码 ${i}号`,
        url: `https://order.yushan.ai/table/${qrConfig.storeId}/${i}`,
        generatedAt: new Date().toISOString()
      });
    }

    this.config.qrCodes = qrCodes;
    this.config.storeInfo = qrConfig;
    this.config.currentStep = 3;
    this.saveConfig();

    return { success: true, qrCodes };
  }

  // 步骤4: 配置打印机
  async step4ConfigurePrinter(printerConfig) {
    this.config.printerConfig = {
      ...printerConfig,
      configuredAt: new Date().toISOString()
    };
    this.config.currentStep = 4;
    this.saveConfig();

    return { success: true };
  }

  // 步骤5: 完成配置
  async step5Finish() {
    this.config.setupComplete = true;
    this.config.currentStep = 5;
    this.config.completedAt = new Date().toISOString();
    this.saveConfig();

    return { success: true };
  }

  // 获取当前配置进度
  getProgress() {
    return {
      setupComplete: this.config.setupComplete,
      currentStep: this.config.currentStep,
      config: this.config
    };
  }

  // 重置配置
  reset() {
    this.config = {
      setupComplete: false,
      currentStep: 1,
      cashierSystem: null,
      printerConfig: null,
      qrCodes: [],
      storeInfo: {
        name: '',
        address: '',
        phone: ''
      }
    };
    this.saveConfig();
    return { success: true };
  }
}

module.exports = SetupWizardService;
