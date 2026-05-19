const os = require('os');
const logger = require('../utils/logger');
const alertService = require('./alertService');

const THRESHOLDS = {
  cpuWarning: 80,
  cpuCritical: 95,
  memoryWarning: 80,
  memoryCritical: 90,
  diskWarning: 90,
  diskCritical: 95
};

class SystemMonitor {
  constructor(options = {}) {
    this.thresholds = { ...THRESHOLDS, ...options };
    this.monitorInterval = null;
    this.lastCpuUsage = null;
  }

  async getSystemStats() {
    const cpus = os.cpus();
    const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
    const totalTick = cpus.reduce(
      (acc, cpu) => acc + Object.values(cpu.times).reduce((a, b) => a + b, 0),
      0
    );

    let cpuUsage = 0;
    if (this.lastCpuUsage) {
      const idleDiff = totalIdle - this.lastCpuUsage.idle;
      const totalDiff = totalTick - this.lastCpuUsage.total;
      cpuUsage = totalDiff > 0 ? Math.round((1 - idleDiff / totalDiff) * 100) : 0;
    }

    this.lastCpuUsage = { idle: totalIdle, total: totalTick };

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsage = Math.round((usedMem / totalMem) * 100);

    return {
      cpu: {
        usage: cpuUsage,
        cores: cpus.length,
        isWarning: cpuUsage > this.thresholds.cpuWarning,
        isCritical: cpuUsage > this.thresholds.cpuCritical
      },
      memory: {
        total: this.formatBytes(totalMem),
        used: this.formatBytes(usedMem),
        free: this.formatBytes(freeMem),
        usage: memoryUsage,
        isWarning: memoryUsage > this.thresholds.memoryWarning,
        isCritical: memoryUsage > this.thresholds.memoryCritical
      },
      loadAverage: os.loadavg(),
      uptime: os.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  async monitor() {
    try {
      const stats = await this.getSystemStats();

      if (stats.cpu.isWarning || stats.memory.isWarning) {
        let alertMessage = '系统资源警告:\n';
        alertMessage += `- CPU使用率: ${stats.cpu.usage}%\n`;
        alertMessage += `- 内存使用率: ${stats.memory.usage}%\n`;
        alertMessage += `- 负载: ${stats.loadAverage.join(', ')}`;

        const level = stats.cpu.isCritical || stats.memory.isCritical ? 'error' : 'warn';
        await alertService.sendAlert('系统资源警告', alertMessage, level);
      }

      logger.debug('系统监控数据:', stats);

      return stats;
    } catch (error) {
      logger.error('系统监控失败:', error);
      return null;
    }
  }

  start(intervalMs = 60 * 1000) {
    logger.info('系统资源监控已启动');

    this.monitor();

    this.monitorInterval = setInterval(() => {
      this.monitor();
    }, intervalMs);

    return this;
  }

  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      logger.info('系统资源监控已停止');
    }
  }
}

const systemMonitor = new SystemMonitor();

module.exports = {
  systemMonitor,
  SystemMonitor
};
