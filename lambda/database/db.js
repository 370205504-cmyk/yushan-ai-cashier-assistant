const path = require('path');
const fs = require('fs');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/database.log' }),
    new winston.transports.Console()
  ]
});

const SQL_INJECTION_PATTERNS = [
  /(['"])\s*OR\s*\1.*--/gi,
  /(['"])\s*AND\s*\1.*--/gi,
  /UNION\s+SELECT/gi,
  /INSERT\s+INTO/gi,
  /UPDATE.*SET/gi,
  /DELETE\s+FROM/gi,
  /DROP\s+(TABLE|DATABASE)/gi,
  /TRUNCATE\s+TABLE/gi,
  /EXEC\s+(\(|UTE|XP_)/gi,
  /SP_(EXECUTE|OACREATE)/gi,
  /xp_cmdshell/gi,
  /0x[0-9a-fA-F]+/g,
  /\b(OR|AND)\b\s*[0-9]+\s*=\s*[0-9]+/gi,
  /\b(OR|AND)\b\s*'[^']*'\s*=\s*'[^']*'/gi,
  /--.*$/gm,
  /\/\*.*\*\//g,
  /;.*--/g
];

const ALLOWED_SQL_COMMANDS = [
  'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CALL', 'SHOW', 'DESCRIBE'
];

const MAX_QUERY_LENGTH = 5000;
const MAX_PARAMS_COUNT = 100;

class Database {
  constructor() {
    this.pool = null;
    this.redis = null;
    this.sqlite = null;
    this.isSQLite = false;
    this.queryLog = [];
    this.maxLogSize = 100;
  }

  async initialize() {
    const dbHost = process.env.DB_HOST;

    if (!dbHost) {
      return this.initSQLite();
    }
    return this.initMySQL();
  }

  async initSQLite() {
    try {
      const Database = require('better-sqlite3');
      const dbPath = path.join(__dirname, 'data', 'cashier.db');
      const dataDir = path.join(__dirname, 'data');

      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.sqlite = new Database(dbPath);
      this.sqlite.pragma('journal_mode = WAL');
      this.sqlite.pragma('busy_timeout = 5000');
      this.sqlite.pragma('foreign_keys = ON');

      this.isSQLite = true;
      logger.info(`SQLite数据库初始化成功: ${dbPath}`);
      return true;
    } catch (error) {
      logger.error('SQLite初始化失败:', error);
      throw error;
    }
  }

  async initMySQL() {
    try {
      const mysql = require('mysql2/promise');
      this.pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'yushan_restaurant',
        waitForConnections: true,
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 20,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        namedPlaceholders: true
      });

      if (process.env.REDIS_HOST) {
        const Redis = require('redis');
        
        if (process.env.NODE_ENV === 'production' && !process.env.REDIS_PASSWORD) {
          logger.warn('WARNING: Redis password not set in production environment. This is a security risk.');
        }

        this.redis = Redis.createClient({
          socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT) || 6379
          },
          password: process.env.REDIS_PASSWORD || undefined,
          database: parseInt(process.env.REDIS_DB) || 0
        });
        await this.redis.connect();
      }

      logger.info('MySQL数据库连接池初始化成功');
      return true;
    } catch (error) {
      logger.error('MySQL初始化失败:', error);
      throw error;
    }
  }

  rewriteSQL(sql) {
    if (!this.isSQLite) return sql;

    let result = sql;

    // DATE_FORMAT -> strftime
    result = result.replace(
      /DATE_FORMAT\((\w+),\s*'%Y-%m-%d\s+%H:00'/g,
      "strftime('%Y-%m-%d %H:00', $1"
    );
    result = result.replace(
      /DATE_FORMAT\((\w+),\s*'%Y-%m-%d'/g,
      "strftime('%Y-%m-%d', $1"
    );
    result = result.replace(
      /DATE_FORMAT\((\w+),\s*'%Y-W%u'/g,
      "strftime('%Y-W%u', $1"
    );
    result = result.replace(
      /DATE_FORMAT\((\w+),\s*'%Y-%m'/g,
      "strftime('%Y-%m', $1"
    );

    // HOUR() -> CAST(strftime('%H', ...) AS INTEGER)
    result = result.replace(
      /HOUR\((\w+)\)/g,
      "CAST(strftime('%H', $1) AS INTEGER)"
    );

    // NOW() -> datetime('now', 'localtime')
    result = result.replace(/\bNOW\(\)/g, "datetime('now', 'localtime')");

    // DATE() -> date()
    result = result.replace(/\bDATE\(/g, "date(");

    // ON DUPLICATE KEY UPDATE -> INSERT OR REPLACE INTO
    result = result.replace(
      /INSERT\s+INTO\s+(\S+)\s*\((.+?)\)\s*VALUES\s*\((.+?)\)\s*ON\s+DUPLICATE\s+KEY\s+UPDATE\s+\w+\s*=\s*\?/gi,
      'INSERT OR REPLACE INTO $1 ($2) VALUES ($3)'
    );

    // FOR UPDATE (not supported in SQLite)
    result = result.replace(/\s+FOR UPDATE/gi, '');

    // Remove backticks
    result = result.replace(/`/g, '');

    return result;
  }

  validateSqlCommand(sql) {
    const trimmedSql = sql.trim().toUpperCase();
    const firstWord = trimmedSql.split(/\s+/)[0];
    
    if (!ALLOWED_SQL_COMMANDS.includes(firstWord)) {
      logger.warn(`非法SQL命令: ${firstWord}`);
      return { valid: false, error: `不允许的SQL命令: ${firstWord}` };
    }
    return { valid: true };
  }

  scanForSqlInjection(sql, params = []) {
    const sqlPatternMatch = SQL_INJECTION_PATTERNS.some(pattern => pattern.test(sql));
    if (sqlPatternMatch) {
      logger.warn('检测到SQL注入模式(SQL):', sql.substring(0, 100));
      return { valid: false, error: '检测到潜在的SQL注入攻击' };
    }

    for (const param of params) {
      if (typeof param === 'string') {
        const paramPatternMatch = SQL_INJECTION_PATTERNS.some(pattern => pattern.test(param));
        if (paramPatternMatch) {
          logger.warn('检测到SQL注入模式(参数):', param.substring(0, 100));
          return { valid: false, error: '检测到潜在的SQL注入攻击' };
        }
      }
    }

    return { valid: true };
  }

  validateQueryLength(sql) {
    if (sql.length > MAX_QUERY_LENGTH) {
      logger.warn('SQL查询长度超限:', sql.length);
      return { valid: false, error: '查询语句过长' };
    }
    return { valid: true };
  }

  validateParams(params) {
    if (!Array.isArray(params)) {
      return { valid: false, error: '参数必须是数组' };
    }

    if (params.length > MAX_PARAMS_COUNT) {
      logger.warn('参数数量超限:', params.length);
      return { valid: false, error: '参数数量过多' };
    }

    for (let i = 0; i < params.length; i++) {
      const param = params[i];
      if (param === null || param === undefined) {
        continue;
      }
      
      if (typeof param === 'string') {
        if (param.length > 1000) {
          logger.warn(`参数${i}长度超限:`, param.length);
          return { valid: false, error: `参数${i}长度超过限制` };
        }
        
        if (param.includes('\0')) {
          logger.warn(`参数${i}包含空字符`);
          return { valid: false, error: '参数包含非法字符' };
        }
      }

      if (typeof param === 'number') {
        if (!isFinite(param)) {
          logger.warn(`参数${i}不是有效数字`);
          return { valid: false, error: '参数必须是有效数字' };
        }
      }
    }

    return { valid: true };
  }

  sanitizeParam(value) {
    if (typeof value === 'string') {
      return value.replace(/[\x00-\x1F\x7F]/g, '');
    }
    return value;
  }

  async query(sql, params = []) {
    const validationResults = [
      this.validateSqlCommand(sql),
      this.scanForSqlInjection(sql, params),
      this.validateQueryLength(sql),
      this.validateParams(params)
    ];

    for (const result of validationResults) {
      if (!result.valid) {
        logger.error('SQL查询验证失败:', result.error);
        throw new Error(`数据库查询验证失败: ${result.error}`);
      }
    }

    const sanitizedParams = params.map(p => this.sanitizeParam(p));

    try {
      if (this.isSQLite) {
        return this.sqliteQuery(sql, sanitizedParams);
      }
      return this.mysqlQuery(sql, sanitizedParams);
    } catch (error) {
      logger.error('数据库查询失败:', { sql: sql.substring(0, 200), error: error.message });
      throw error;
    }
  }

  sqliteQuery(sql, params) {
    const rewrittenSQL = this.rewriteSQL(sql);
    const trimmedSQL = rewrittenSQL.trim().toUpperCase();

    // Detect query type
    if (trimmedSQL.startsWith('SELECT') || trimmedSQL.startsWith('WITH')) {
      const stmt = this.sqlite.prepare(rewrittenSQL);
      const rows = stmt.all(...params);
      this.logQuery(sql, params, rows.length);
      return rows;
    }

    if (trimmedSQL.startsWith('INSERT')) {
      const stmt = this.sqlite.prepare(rewrittenSQL);
      const result = stmt.run(...params);
      this.logQuery(sql, params, result.changes);
      return { insertId: Number(result.lastInsertRowid), affectedRows: result.changes };
    }

    if (trimmedSQL.startsWith('UPDATE') || trimmedSQL.startsWith('DELETE')) {
      const stmt = this.sqlite.prepare(rewrittenSQL);
      const result = stmt.run(...params);
      this.logQuery(sql, params, result.changes);
      return { affectedRows: result.changes, changes: result.changes };
    }

    // Fallback for other statements
    const stmt = this.sqlite.prepare(rewrittenSQL);
    const result = stmt.run(...params);
    this.logQuery(sql, params, result.changes);
    return { affectedRows: result.changes };
  }

  async mysqlQuery(sql, params) {
    const [rows] = await this.pool.execute(sql, params);
    this.logQuery(sql, params, rows.length || rows.affectedRows || 0);
    return rows;
  }

  getConnection() {
    if (this.isSQLite) {
      return {
        query: (sql, params) => this.sqliteQuery(sql, params),
        release: () => {}
      };
    }
    return this.pool.getConnection();
  }

  async transaction(callback) {
    if (this.isSQLite) {
      const transaction = this.sqlite.transaction((cb) => {
        const connection = {
          query: (sql, params) => {
            const rewrittenSQL = this.rewriteSQL(sql);
            const trimmedSQL = rewrittenSQL.trim().toUpperCase();
            
            if (trimmedSQL.startsWith('SELECT')) {
              const stmt = this.sqlite.prepare(rewrittenSQL);
              return stmt.all(...params);
            }
            
            const stmt = this.sqlite.prepare(rewrittenSQL);
            const result = stmt.run(...params);
            
            if (trimmedSQL.startsWith('INSERT')) {
              return { insertId: Number(result.lastInsertRowid), affectedRows: result.changes };
            }
            return { affectedRows: result.changes, changes: result.changes };
          }
        };
        return cb(connection);
      });

      return transaction(callback);
    }

    const connection = await this.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  logQuery(sql, params, rowCount) {
    const logEntry = {
      timestamp: Date.now(),
      sql: sql.substring(0, 200),
      params: params.length,
      rowCount,
      duration: Date.now() - (this.queryLog[this.queryLog.length - 1]?.timestamp || Date.now())
    };
    
    this.queryLog.push(logEntry);
    if (this.queryLog.length > this.maxLogSize) {
      this.queryLog.shift();
    }
  }

  async cacheGet(key) {
    try {
      if (typeof key !== 'string') {
        logger.warn('Redis key必须是字符串');
        return null;
      }
      
      if (key.length > 1000) {
        logger.warn('Redis key长度超限');
        return null;
      }

      const sanitizedKey = key.replace(/[\x00-\x1F\x7F]/g, '');
      const value = await this.redis.get(sanitizedKey);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  async cacheSet(key, value, ttl = 3600) {
    try {
      if (typeof key !== 'string') {
        logger.warn('Redis key必须是字符串');
        return false;
      }
      
      if (key.length > 1000) {
        logger.warn('Redis key长度超限');
        return false;
      }

      const sanitizedKey = key.replace(/[\x00-\x1F\x7F]/g, '');
      await this.redis.setEx(sanitizedKey, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Redis set error:', error);
      return false;
    }
  }

  async cacheDel(key) {
    try {
      if (typeof key !== 'string') {
        logger.warn('Redis key必须是字符串');
        return false;
      }

      const sanitizedKey = key.replace(/[\x00-\x1F\x7F]/g, '');
      await this.redis.del(sanitizedKey);
      return true;
    } catch (error) {
      logger.error('Redis del error:', error);
      return false;
    }
  }

  async close() {
    if (this.sqlite) {
      this.sqlite.close();
      logger.info('SQLite数据库连接已关闭');
    }
    if (this.pool) {
      await this.pool.end();
    }
    if (this.redis) {
      await this.redis.quit();
    }
    logger.info('数据库连接已关闭');
  }

  getQueryStats() {
    if (this.queryLog.length === 0) {
      return { totalQueries: 0, avgDuration: 0 };
    }

    const totalDuration = this.queryLog.reduce((sum, entry) => sum + entry.duration, 0);
    return {
      totalQueries: this.queryLog.length,
      avgDuration: totalDuration / this.queryLog.length
    };
  }
}

module.exports = new Database();