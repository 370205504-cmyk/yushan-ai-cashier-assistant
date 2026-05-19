const db = require('./db');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const crypto = require('crypto');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/backup.log' }),
    new winston.transports.Console()
  ]
});

const BACKUP_ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY;
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

function encryptData(data, key) {
  const iv = crypto.randomBytes(12);
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256');
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, derivedKey, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return {
    iv: iv.toString('hex'),
    salt: salt.toString('hex'),
    authTag: authTag,
    data: encrypted
  };
}

function decryptData(encryptedData, key) {
  const { iv, salt, authTag, data } = encryptedData;
  const derivedKey = crypto.pbkdf2Sync(key, Buffer.from(salt, 'hex'), 100000, 32, 'sha256');
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, derivedKey, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

class BackupService {
  constructor() {
    this.backupPath = process.env.BACKUP_PATH || path.join(__dirname, '../../backups');
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
    if (process.env.NODE_ENV === 'production' && !BACKUP_ENCRYPTION_KEY) {
      logger.warn('BACKUP_ENCRYPTION_KEY not set in production, backups will not be encrypted');
    }
  }

  async ensureBackupDir() {
    try {
      await fs.mkdir(this.backupPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  async backupDatabase() {
    await this.ensureBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}-${uuidv4().slice(0, 8)}.json`;
    const filepath = path.join(this.backupPath, filename);

    try {
      const allowedTables = ['users', 'dishes', 'orders', 'order_items', 'coupons', 'user_coupons', 'points_log', 'replenish_log'];
      const backup = {
        version: '3.0.0',
        timestamp: new Date().toISOString(),
        encrypted: !!BACKUP_ENCRYPTION_KEY,
        tables: {}
      };

      for (const table of allowedTables) {
        logger.info(`备份表: ${table}`);
        const rows = await db.query(`SELECT * FROM ${table}`);
        backup.tables[table] = rows;
      }

      let outputData = JSON.stringify(backup, null, 2);
      if (BACKUP_ENCRYPTION_KEY) {
        outputData = JSON.stringify(encryptData(outputData, BACKUP_ENCRYPTION_KEY));
      }

      await fs.writeFile(filepath, outputData, 'utf8');
      await fs.chmod(filepath, 0o600);
      logger.info(`数据库备份成功: ${filename}`);

      await this.cleanOldBackups();
      await this.saveBackupRecord(filename, backup);

      return { success: true, filename, path: filepath, encrypted: !!BACKUP_ENCRYPTION_KEY };
    } catch (error) {
      logger.error('备份失败:', error);
      throw error;
    }
  }

  async restoreDatabase(backupFile) {
    try {
      if (path.isAbsolute(backupFile)) {
        throw new Error('不允许使用绝对路径恢复备份');
      }

      const sanitizedFilename = backupFile.replace(/\.\./g, '').replace(/\//g, '');
      const filepath = path.join(this.backupPath, sanitizedFilename);

      const data = await fs.readFile(filepath, 'utf8');
      let backup = JSON.parse(data);

      if (backup.iv && backup.salt && backup.authTag && backup.data) {
        if (!BACKUP_ENCRYPTION_KEY) {
          throw new Error('备份文件已加密，但未配置解密密钥');
        }
        const decryptedData = decryptData(backup, BACKUP_ENCRYPTION_KEY);
        backup = JSON.parse(decryptedData);
      }

      if (!backup.version || !backup.tables || !backup.timestamp) {
        throw new Error('无效的备份文件格式');
      }

      if (backup.version !== '3.0.0') {
        throw new Error(`不支持的备份版本: ${backup.version}`);
      }

      const allowedTables = ['users', 'dishes', 'orders', 'order_items', 'coupons', 'user_coupons', 'points_log', 'replenish_log'];

      logger.info(`开始恢复数据库，备份时间: ${backup.timestamp}`);

      await db.transaction(async (connection) => {
        const tables = Object.keys(backup.tables);

        for (const table of tables) {
          if (!allowedTables.includes(table)) {
            logger.warn(`跳过不在白名单中的表: ${table}`);
            continue;
          }

          logger.info(`清空表: ${table}`);
          await connection.query(`DELETE FROM ${table}`);

          const rows = backup.tables[table];
          if (rows && rows.length > 0) {
            const columns = Object.keys(rows[0]).filter(col => 
              !['password', 'api_key', 'secret_key'].includes(col.toLowerCase())
            );
            const placeholders = columns.map(() => '?').join(', ');
            const values = rows.map(row => columns.map(col => row[col]));

            const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
            for (const row of values) {
              await connection.query(sql, row);
            }
            logger.info(`恢复表: ${table}, ${rows.length} 条记录`);
          }
        }
      });

      logger.info('数据库恢复完成');
      return { success: true, message: '数据库恢复成功' };
    } catch (error) {
      logger.error('恢复失败:', error);
      throw error;
    }
  }

  async listBackups() {
    await this.ensureBackupDir();
    try {
      const files = await fs.readdir(this.backupPath);
      const backups = await Promise.all(
        files
          .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
          .map(async (f) => {
            const stats = await fs.stat(path.join(this.backupPath, f));
            const data = await fs.readFile(path.join(this.backupPath, f), 'utf8');
            const backup = JSON.parse(data);
            return {
              filename: f,
              timestamp: backup.timestamp,
              size: stats.size,
              tables: Object.keys(backup.tables)
            };
          })
      );
      return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async cleanOldBackups() {
    try {
      const backups = await this.listBackups();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      for (const backup of backups) {
        if (new Date(backup.timestamp) < cutoffDate) {
          await fs.unlink(path.join(this.backupPath, backup.filename));
          logger.info(`删除过期备份: ${backup.filename}`);
        }
      }
    } catch (error) {
      logger.error('清理旧备份失败:', error);
    }
  }

  async saveBackupRecord(filename, backup) {
    try {
      const recordFile = path.join(this.backupPath, 'backup_records.json');
      let records = [];
      try {
        const data = await fs.readFile(recordFile, 'utf8');
        records = JSON.parse(data);
      } catch (e) {}

      records.push({
        filename,
        timestamp: backup.timestamp,
        version: backup.version,
        tables: Object.keys(backup.tables)
      });

      await fs.writeFile(recordFile, JSON.stringify(records.slice(-100), null, 2));
    } catch (error) {
      logger.error('保存备份记录失败:', error);
    }
  }
}

module.exports = new BackupService();
