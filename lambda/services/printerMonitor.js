const net = require('net');
const logger = require('./logger');

class PrinterMonitor {
  constructor() {
    this.status = 'unknown';
    this.lastCheck = null;
    this.checkInterval = 60000;
    this.intervalId = null;
    this.listeners = [];
  }

  onStatusChange(callback) {
    this.listeners.push(callback);
  }

  notifyListeners(oldStatus, newStatus) {
    this.listeners.forEach(cb => {
      try {
        cb(oldStatus, newStatus);
      } catch (e) {
        logger.error('打印机状态回调失败', { error: e.message });
      }
    });
  }

  async checkStatus(ip, port) {
    const oldStatus = this.status;
    this.lastCheck = new Date();

    return new Promise((resolve) => {
      const client = new net.Socket();
      const timeout = 5000;

      client.setTimeout(timeout);

      client.connect(port, ip, () => {
        this.status = 'online';
        client.destroy();
        if (oldStatus !== 'online') {
          this.notifyListeners(oldStatus, 'online');
          logger.info('打印机恢复连接', { ip, port });
        }
        resolve('online');
      });

      client.on('timeout', () => {
        this.status = 'offline';
        client.destroy();
        if (oldStatus !== 'offline') {
          this.notifyListeners(oldStatus, 'offline');
          logger.warn('打印机连接超时', { ip, port });
        }
        resolve('offline');
      });

      client.on('error', (err) => {
        this.status = 'error';
        client.destroy();
        if (oldStatus !== 'error') {
          this.notifyListeners(oldStatus, 'error');
          logger.error('打印机连接失败', { ip, port, error: err.message });
        }
        resolve('error');
      });
    });
  }

  startMonitoring(printerConfig) {
    const { ip, port } = printerConfig;
    this.intervalId = setInterval(async () => {
      await this.checkStatus(ip, port);
    }, this.checkInterval);
    logger.info('打印机监控已启动', { ip, port, interval: this.checkInterval });
  }

  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('打印机监控已停止');
    }
  }

  getStatus() {
    return {
      status: this.status,
      lastCheck: this.lastCheck
    };
  }
}

module.exports = new PrinterMonitor();
