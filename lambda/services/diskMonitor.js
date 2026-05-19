const os = require('os');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const alertService = require('./alertService');

const DEFAULT_THRESHOLDS = {
  diskWarning: 90,
  diskCritical: 95,
  autoCleanDays: 7
};

class DiskMonitor {
  constructor(options = {}) {
    this.thresholds = {
      diskWarning: options.diskWarning || DEFAULT_THRESHOLDS.diskWarning,
      diskCritical: options.diskCritical || DEFAULT_THRESHOLDS.diskCritical,
      autoCleanDays: options.autoCleanDays || DEFAULT_THRESHOLDS.autoCleanDays
    };
    this.monitorInterval = null;
    this.platform = os.platform();
    this.rootPath = this.platform === 'win32' ? 'C:' : '/';
  }

  async checkDiskSpace() {
    try {
      const { available, total } = this.getDiskSpaceSync();
      const usedPercent = ((total - available) / total) * 100;

      return {
        available,
        total,
        used: total - available,
        usagePercent: usedPercent.toFixed(2),
        isWarning: usedPercent > this.thresholds.diskWarning,
        isCritical: usedPercent > this.thresholds.diskCritical
      };
    } catch (error) {
      logger.error('Failed to check disk space:', error);
      return null;
    }
  }

  getDiskSpaceSync() {
    try {
      const stat = fs.statfsSync || this.fallbackStatFs;
      if (typeof stat === 'function') {
        const stats = stat(this.rootPath);
        return {
          available: stats.bsize * stats.bfree,
          total: stats.bsize * stats.blocks
        };
      }
    } catch (error) {
      logger.warn('statfs not available, using fallback');
    }
    return { available: 0, total: 0 };
  }

  fallbackStatFs(path) {
    try {
      if (process.platform === 'linux') {
        const { execSync } = require('child_process');
        const output = execSync(`df -k "${path}" | tail -1`).toString();
        const parts = output.split(/\s+/);
        return {
          bsize: 1024,
          blocks: parseInt(parts[1]),
          bfree: parseInt(parts[3])
        };
      }
    } catch (error) {
      logger.warn('statfs fallback failed:', error.message);
    }
    return { bsize: 1024, blocks: 0, bfree: 0 };
  }

  async handleDiskWarning(status) {
    const message = `磁盘空间不足警告: 使用率 ${status.usagePercent}%，剩余空间 ${this.formatBytes(status.available)}`;

    logger.error(message);

    if (status.isCritical) {
      await this.cleanOldLogs();
      await alertService.sendAlert('磁盘空间严重不足', `${message }\n已自动清理7天前的日志文件`, 'error');
    } else {
      await alertService.sendAlert('磁盘空间警告', message, 'warn');
    }
  }

  async cleanOldLogs(daysToKeep = null) {
    const days = daysToKeep || this.thresholds.autoCleanDays;
    const logDir = path.join(process.cwd(), 'logs');
    const now = Date.now();
    const maxAge = days * 24 * 60 * 60 * 1000;
    let cleanedCount = 0;
    let cleanedSize = 0;

    try {
      if (!fs.existsSync(logDir)) {
        return { cleanedCount: 0, cleanedSize: 0 };
      }

      const files = fs.readdirSync(logDir);

      for (const file of files) {
        const filePath = path.join(logDir, file);
        const stat = fs.statSync(filePath);

        if (stat.isFile() && (now - stat.mtimeMs) > maxAge) {
          const size = stat.size;
          fs.unlinkSync(filePath);
          cleanedCount++;
          cleanedSize += size;
          logger.info(`已删除过期日志: ${file} (${this.formatBytes(size)})`);
        }
      }
    } catch (error) {
      logger.error('清理日志文件失败:', error);
    }

    return { cleanedCount, cleanedSize };
  }

  formatBytes(bytes) {
    if (bytes === 0) {
      return '0 B';
    }
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2)) } ${ sizes[i]}`;
  }

  start(intervalMs = 60 * 1000) {
    logger.info('磁盘监控服务已启动');

    this.monitor();

    this.monitorInterval = setInterval(() => {
      this.monitor();
    }, intervalMs);

    return this;
  }

  async monitor() {
    const status = await this.checkDiskSpace();

    if (status && status.isWarning) {
      await this.handleDiskWarning(status);
    }
  }

  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      logger.info('磁盘监控服务已停止');
    }
  }
}

const diskMonitor = new DiskMonitor();

module.exports = {
  diskMonitor,
  DiskMonitor
};
