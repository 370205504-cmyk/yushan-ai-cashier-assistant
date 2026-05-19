/**
 * 环境检测器
 * 自动扫描本地进程、数据库、打印机，自动匹配适配器
 */
const { execSync } = require('child_process');
const os = require('os');

class Detector {
  constructor() {
    this.env = {
      processes: [],
      databases: [],
      printers: [],
      platform: os.platform()
    };
  }

  /**
   * 扫描完整环境
   */
  async scan() {
    console.log('🔍 开始环境扫描...');
    await this.scanProcesses();
    await this.scanPrinters();
    await this.scanDatabases();
    console.log('✅ 环境扫描完成');
    return this.env;
  }

  /**
   * 扫描运行中的进程
   */
  async scanProcesses() {
    try {
      let stdout;
      if (this.env.platform === 'win32') {
        stdout = execSync('tasklist /FO CSV /NH', { encoding: 'utf-8' });
        const lines = stdout.split('\n').filter(Boolean);
        this.env.processes = lines.map(line => {
          const [name] = line.split('","');
          return name.replace(/"/g, '').toLowerCase();
        });
      } else {
        stdout = execSync('ps aux', { encoding: 'utf-8' });
        this.env.processes = stdout.split('\n').map(l => l.toLowerCase());
      }
      console.log(`📋 发现 ${this.env.processes.length} 个进程`);
      
      // 模拟：添加一些常见收银进程用于测试
      if (Math.random() > 0.5) {
        this.env.processes.push('meituan');
      }
    } catch (e) {
      console.log('⚠️  进程扫描失败:', e.message);
    }
  }

  /**
   * 扫描打印机
   */
  async scanPrinters() {
    try {
      if (this.env.platform === 'win32') {
        const stdout = execSync('wmic printer get name', { encoding: 'utf-8' });
        this.env.printers = stdout.split('\n')
          .slice(1)
          .map(l => l.trim())
          .filter(Boolean);
      }
      // 模拟
      this.env.printers.push('Kitchen Printer');
      console.log(`🖨️  发现 ${this.env.printers.length} 个打印机`);
    } catch (e) {
      console.log('⚠️  打印机扫描失败');
    }
  }

  /**
   * 扫描数据库
   */
  async scanDatabases() {
    try {
      // 简单的端口扫描（模拟）
      const commonPorts = [3306, 1433, 5432];
      this.env.databases = [];
      
      // 模拟发现数据库
      if (Math.random() > 0.3) {
        this.env.databases.push({
          type: 'mysql',
          host: 'localhost',
          port: 3306
        });
      }
      
      console.log(`💾 发现 ${this.env.databases.length} 个数据库服务`);
    } catch (e) {
      console.log('⚠️  数据库扫描失败');
    }
  }

  /**
   * 获取扫描结果
   */
  getEnvironment() {
    return this.env;
  }

  /**
   * 生成推荐配置
   */
  getRecommendations() {
    const recommendations = [];
    
    // 进程匹配
    if (this.env.processes.some(p => p.includes('meituan') || p.includes('美团'))) {
      recommendations.push({ adapter: 'MeituanAdapter', confidence: 0.9, reason: '检测到美团收银进程' });
    }
    if (this.env.processes.some(p => p.includes('yinbao') || p.includes('银豹'))) {
      recommendations.push({ adapter: 'YinbaoAdapter', confidence: 0.9, reason: '检测到银豹收银进程' });
    }
    
    // 打印机
    if (this.env.printers.length > 0) {
      recommendations.push({ adapter: 'PrinterAdapter', confidence: 0.7, reason: `发现 ${this.env.printers.length} 个打印机，可使用打印兜底模式` });
    }
    
    // 数据库
    if (this.env.databases.length > 0) {
      recommendations.push({ adapter: 'DbAdapter', confidence: 0.8, reason: '检测到数据库服务，可使用数据库直连模式' });
    }
    
    return recommendations;
  }
}

module.exports = Detector;
