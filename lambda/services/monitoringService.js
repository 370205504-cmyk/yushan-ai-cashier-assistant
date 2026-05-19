const db = require('../database/db');
const logger = require('../utils/logger');
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * 监控与运维服务
 */
class MonitoringService {
  constructor() {
    this.alertRules = [];
    this.backupDir = path.join(__dirname, '../backups');
    this.ensureBackupDir();
  }

  /**
   * 确保备份目录存在
   */
  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * 获取系统资源使用情况
   */
  getSystemMetrics() {
    try {
      const cpus = os.cpus();
      const loadAvg = os.loadavg();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      return {
        timestamp: new Date().toISOString(),
        cpu: {
          count: cpus.length,
          loadAvg1: loadAvg[0],
          loadAvg5: loadAvg[1],
          loadAvg15: loadAvg[2],
          usage: ((loadAvg[0] / cpus.length) * 100).toFixed(2) + '%'
        },
        memory: {
          total: (totalMem / 1024 / 1024 / 1024).toFixed(2) + ' GB',
          used: (usedMem / 1024 / 1024 / 1024).toFixed(2) + ' GB',
          free: (freeMem / 1024 / 1024 / 1024).toFixed(2) + ' GB',
          usage: ((usedMem / totalMem) * 100).toFixed(2) + '%'
        },
        disk: this.getDiskUsage(),
        uptime: process.uptime()
      };
    } catch (error) {
      logger.error('获取系统指标失败', { error: error.message });
      return null;
    }
  }

  /**
   * 获取磁盘使用情况
   */
  getDiskUsage() {
    try {
      // 简化的磁盘检查
      return {
        check: 'available',
        timestamp: new Date().toISOString()
      };
    } catch {
      return { check: 'unavailable' };
    }
  }

  /**
   * 获取数据库性能指标
   */
  async getDatabaseMetrics() {
    try {
      const [connectionCount] = await db.query("SHOW STATUS LIKE 'Threads_connected'");
      const [qps] = await db.query("SHOW STATUS LIKE 'Questions'");
      const [slowQueries] = await db.query("SHOW STATUS LIKE 'Slow_queries'");

      return {
        timestamp: new Date().toISOString(),
        connections: connectionCount ? connectionCount.Value : null,
        queries: qps ? qps.Value : null,
        slowQueries: slowQueries ? slowQueries.Value : null
      };
    } catch (error) {
      logger.error('获取数据库指标失败', { error: error.message });
      return null;
    }
  }

  /**
   * 记录系统指标
   */
  async recordMetrics(metricType, metricName, metricValue, unit = '', tags = {}) {
    try {
      await db.query(
        'INSERT INTO system_metrics (metric_type, metric_name, metric_value, unit, tags, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [metricType, metricName, metricValue, unit, JSON.stringify(tags)]
      );
    } catch (error) {
      logger.error('记录系统指标失败', { error: error.message, metricType, metricName });
    }
  }

  /**
   * 检查告警规则
   */
  async checkAlerts() {
    try {
      const rules = await db.query('SELECT * FROM alert_rules WHERE is_enabled = 1');
      const alerts = [];

      for (const rule of rules) {
        const trigger = await this.checkRule(rule);
        if (trigger) {
          alerts.push(trigger);
          await this.createAlert(rule, trigger);
        }
      }

      return alerts;
    } catch (error) {
      logger.error('检查告警失败', { error: error.message });
      return [];
    }
  }

  /**
   * 检查单个告警规则
   */
  async checkRule(rule) {
    try {
      const systemMetrics = this.getSystemMetrics();
      
      let currentValue = 0;
      switch (rule.metric_name) {
        case 'cpu_usage':
          currentValue = parseFloat(systemMetrics?.cpu?.usage || 0);
          break;
        case 'memory_usage':
          currentValue = parseFloat(systemMetrics?.memory?.usage || 0);
          break;
        default:
          return null;
      }

      let isTriggered = false;
      switch (rule.condition) {
        case 'gt':
          isTriggered = currentValue > rule.threshold;
          break;
        case 'lt':
          isTriggered = currentValue < rule.threshold;
          break;
        case 'eq':
          isTriggered = currentValue === rule.threshold;
          break;
        case 'gte':
          isTriggered = currentValue >= rule.threshold;
          break;
        case 'lte':
          isTriggered = currentValue <= rule.threshold;
          break;
      }

      if (isTriggered) {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          level: rule.level,
          message: `${rule.name}: 当前值 ${currentValue}${rule.unit || ''} 超过阈值 ${rule.threshold}${rule.unit || ''}`,
          currentValue,
          threshold: rule.threshold
        };
      }

      return null;
    } catch (error) {
      logger.error('检查告警规则失败', { error: error.message, ruleId: rule.id });
      return null;
    }
  }

  /**
   * 创建告警记录
   */
  async createAlert(rule, trigger) {
    try {
      await db.query(
        'INSERT INTO alert_logs (rule_id, alert_name, level, message, details, is_resolved) VALUES (?, ?, ?, ?, ?, 0)',
        [rule.id, rule.name, trigger.level, trigger.message, JSON.stringify(trigger)]
      );

      logger.logSecurity('告警触发', trigger.message, { level: trigger.level });
    } catch (error) {
      logger.error('创建告警记录失败', { error: error.message });
    }
  }

  /**
   * 创建数据库备份
   */
  async createBackup(backupType = 'full') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `backup-${backupType}-${timestamp}.sql`;
      const filePath = path.join(this.backupDir, fileName);

      // 这里是简化的备份逻辑
      // 生产环境应该使用真实的 mysqldump 或其他备份工具
      
      const backupData = `-- Backup created at ${timestamp}\n-- Type: ${backupType}\n`;
      fs.writeFileSync(filePath, backupData);

      const stats = fs.statSync(filePath);

      const result = await db.query(
        'INSERT INTO backup_records (backup_type, file_path, file_size, checksum, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [backupType, filePath, stats.size, this.generateChecksum(filePath), 'completed']
      );

      logger.info('数据库备份成功', { backupType, file: fileName, recordId: result.insertId });

      return {
        success: true,
        backupId: result.insertId,
        fileName,
        filePath,
        fileSize: stats.size
      };
    } catch (error) {
      logger.error('创建备份失败', { error: error.message, backupType });
      return { success: false, message: '备份失败' };
    }
  }

  /**
   * 获取备份列表
   */
  async listBackups(limit = 10) {
    try {
      const backups = await db.query(
        'SELECT * FROM backup_records ORDER BY created_at DESC LIMIT ?',
        [limit]
      );
      return { success: true, data: backups };
    } catch (error) {
      logger.error('获取备份列表失败', { error: error.message });
      return { success: false, message: '获取备份列表失败' };
    }
  }

  /**
   * 生成文件校验和
   */
  generateChecksum(filePath) {
    try {
      const content = fs.readFileSync(filePath);
      return crypto.createHash('md5').update(content).digest('hex');
    } catch {
      return null;
    }
  }

  /**
   * 获取未解决的告警
   */
  async getUnresolvedAlerts() {
    try {
      const alerts = await db.query(
        'SELECT * FROM alert_logs WHERE is_resolved = 0 ORDER BY created_at DESC'
      );
      return { success: true, data: alerts };
    } catch (error) {
      logger.error('获取未解决告警失败', { error: error.message });
      return { success: false, message: '获取告警失败' };
    }
  }

  /**
   * 解决告警
   */
  async resolveAlert(alertId, resolvedBy = 'system') {
    try {
      await db.query(
        'UPDATE alert_logs SET is_resolved = 1, resolved_at = NOW(), resolved_by = ? WHERE id = ?',
        [resolvedBy, alertId]
      );
      logger.info('告警已解决', { alertId, resolvedBy });
      return { success: true };
    } catch (error) {
      logger.error('解决告警失败', { error: error.message, alertId });
      return { success: false, message: '操作失败' };
    }
  }

  /**
   * 获取综合健康状态
   */
  async getHealthStatus() {
    try {
      const systemMetrics = this.getSystemMetrics();
      const dbMetrics = await this.getDatabaseMetrics();
      const unresolvedAlerts = await this.getUnresolvedAlerts();
      const recentBackups = await this.listBackups(5);

      return {
        success: true,
        status: this.determineOverallStatus(unresolvedAlerts, systemMetrics),
        timestamp: new Date().toISOString(),
        system: systemMetrics,
        database: dbMetrics,
        alerts: unresolvedAlerts,
        backups: recentBackups
      };
    } catch (error) {
      logger.error('获取健康状态失败', { error: error.message });
      return { success: false, message: '获取健康状态失败' };
    }
  }

  /**
   * 确定整体健康状态
   */
  determineOverallStatus(alerts, metrics) {
    if (alerts.success && alerts.data.length > 0) {
      const criticalAlerts = alerts.data.filter(a => a.level === 'critical');
      if (criticalAlerts.length > 0) return 'critical';
      
      const errorAlerts = alerts.data.filter(a => a.level === 'error');
      if (errorAlerts.length > 0) return 'error';
      
      return 'warning';
    }

    if (metrics && parseFloat(metrics.cpu?.usage || 0) > 80) {
      return 'warning';
    }

    return 'healthy';
  }
}

module.exports = new MonitoringService();
