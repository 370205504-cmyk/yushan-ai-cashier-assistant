require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const compression = require('compression');
const db = require('./database/db');
const backupService = require('./database/backup');
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');

// v4.2.0 新增：适配器和检测器
const { getAdapterManager } = require('./adapters');
const Detector = require('./services/detector');
const SyncEngine = require('./services/sync-engine');

// v4.3.0 新增：MCP和AI相关
const MCPHandler = require('./mcp/handler');
const WeWorkBot = require('./integrations/wework-bot');
const AIReport = require('./services/ai-report');
const DataValidator = require('./services/data-validator');
const DataWatcher = require('./services/data-watcher');

const authRoutes = require('./routes/auth');
const wechatRoutes = require('./routes/wechat');
const paymentRoutes = require('./routes/payment');
const memberRoutes = require('./routes/member');
const stockRoutes = require('./routes/stock');
const dishesRoutes = require('./routes/dishes');
const orderRoutes = require('./routes/order');
const deliveryRoutes = require('./routes/delivery');
const queueRoutes = require('./routes/queue');
const analyticsRoutes = require('./routes/analytics');
const storeRoutes = require('./routes/store');
const apiRoutes = require('./routes/api');
const agentRoutes = require('./routes/agent');
const adminRoutes = require('./routes/admin');
const monitorRoutes = require('./routes/monitor');
const exportRoutes = require('./routes/export');
const userDataRoutes = require('./routes/userData');
const paymentConfigRoutes = require('./routes/paymentConfig');
const llmConfigRoutes = require('./routes/llm-config');
const cartRoutes = require('./routes/cart');
const devSkillsRoutes = require('./routes/dev-skills');
const skillManagerRoutes = require('./routes/skill-manager');

const { apiLimiter, helmetConfig, corsConfig, inputSanitize, xssProtection, ipProtection, csrfProtection } = require('./middleware/security');
const { requireAdmin, requireAuth } = require('./middleware/auth');
const session = require('express-session');
const RedisStore = require('connect-redis').default;

const isProduction = process.env.NODE_ENV === 'production';
const forceHttps = process.env.FORCE_HTTPS === 'true';

const enforceHttps = (req, res, next) => {
  if (forceHttps && isProduction) {
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      return next();
    }
    const httpsUrl = `https://${req.hostname}${req.url}`;
    return res.redirect(301, httpsUrl);
  }
  next();
};

const app = express();

app.use(compression());
app.use(helmetConfig);
app.use(corsConfig);
app.use(ipProtection);
app.use(inputSanitize);
app.use(xssProtection);
app.use(enforceHttps);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error('ERROR: SESSION_SECRET environment variable is required in production. Please set SESSION_SECRET in your .env file.');
}

const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'yushan-ai-cashier-session-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000
  },
  name: 'yushan.sid'
};

if (db.redis && db.redis.isOpen) {
  sessionConfig.store = new RedisStore({
    client: db.redis,
    prefix: 'session:',
    ttl: 24 * 60 * 60
  });
}

app.use(session(sessionConfig));

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  next();
});

app.use(csrfProtection);

app.use(express.static(path.join(__dirname, 'web'), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  index: false
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  index: false
}));

app.use((req, res, next) => {
  logger.info('请求', { method: req.method, path: req.path, ip: req.ip });
  next();
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/auth/wechat', wechatRoutes);
app.use('/api/v1/payment', paymentRoutes);
app.use('/api/v1/member', memberRoutes);
app.use('/api/v1/stock', stockRoutes);
app.use('/api/v1/dishes', dishesRoutes);
app.use('/api/v1/order', orderRoutes);
app.use('/api/v1/delivery', deliveryRoutes);
app.use('/api/v1/queue', queueRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/store', storeRoutes);
app.use('/api/v1/payment-config', paymentConfigRoutes);
app.use('/api/v1', apiLimiter, apiRoutes);
app.use('/agent', agentRoutes);
app.use('/admin', adminRoutes);
app.use('/monitor', monitorRoutes);
app.use('/api/v1/export', exportRoutes);
app.use('/api/v1/user', userDataRoutes);
app.use('/api/v1/llm-config', llmConfigRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/dev', devSkillsRoutes);
app.use('/api/v1/skills', skillManagerRoutes);

app.get('/', (req, res) => {
  res.redirect('/mobile');
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'admin.html'));
});

app.get('/llm-config', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'llm-config.html'));
});

app.get('/mobile', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'mobile.html'));
});

app.get('/api/v1/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '5.0.0',
    services: {
      database: 'unknown',
      redis: 'unknown',
      circuitBreaker: 'closed'
    }
  };

  try {
    if (db.isSQLite) {
      const result = db.sqlite.prepare('SELECT 1').get();
      health.services.database = result ? 'connected' : 'disconnected';
    } else if (db.pool) {
      await db.pool.query('SELECT 1');
      health.services.database = 'connected';
    }
  } catch (e) {
    health.services.database = 'disconnected';
    health.status = 'degraded';
  }

  try {
    if (db.redis && db.redis.isOpen) {
      await db.redis.ping();
      health.services.redis = 'connected';
    }
  } catch (e) {
    health.services.redis = 'disconnected';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

app.post('/api/v1/backup', requireAdmin, async (req, res) => {
  try {
    const result = await backupService.backupDatabase();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: '备份失败' });
  }
});

app.get('/api/v1/backups', requireAdmin, async (req, res) => {
  try {
    const backups = await backupService.listBackups();
    res.json({ success: true, backups });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取备份列表失败' });
  }
});

app.post('/api/v1/restore', requireAdmin, async (req, res) => {
  try {
    const result = await backupService.restoreDatabase(req.body.filename);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: '恢复失败' });
  }
});

// ========== v4.2.0 新增：适配器管理 API ==========
app.get('/api/v1/adapters', requireAdmin, async (req, res) => {
  const manager = getAdapterManager();
  res.json({
    success: true,
    adapters: manager.getAvailableAdapters(),
    activeAdapter: manager.getActiveAdapter()?.getName() || null
  });
});

app.post('/api/v1/adapters/activate', requireAdmin, async (req, res) => {
  try {
    const { adapterName, config } = req.body;
    const manager = getAdapterManager();
    const adapter = await manager.activateAdapter(adapterName, config);
    res.json({ success: true, adapter: adapter.getName() });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

app.post('/api/v1/detect', requireAdmin, async (req, res) => {
  try {
    const detector = new Detector();
    const env = await detector.scan();
    const recommendations = detector.getRecommendations();
    res.json({ success: true, environment: env, recommendations });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/api/v1/sync/status', requireAdmin, async (req, res) => {
  // 模拟同步状态
  res.json({
    success: true,
    status: 'idle',
    lastSync: new Date().toISOString(),
    pendingOrders: 0
  });
});

// ========== v4.3.0 新增：MCP和AI API ==========
let mcpHandler;
let weworkBot;
let aiReport;

app.post('/api/v1/mcp/message', requireAuth, async (req, res) => {
  if (!mcpHandler) mcpHandler = new MCPHandler();
  const { sessionId, customerId, message } = req.body;
  const result = await mcpHandler.handleMessage(sessionId, customerId, message);
  res.json({ success: true, data: result });
});

app.post('/api/v1/wework/callback', requireAdmin, async (req, res) => {
  if (!weworkBot) weworkBot = new WeWorkBot();
  const result = await weworkBot.handleKouZiCallback(req.body);
  res.json({ success: true, data: result });
});

app.get('/api/v1/report/daily', requireAdmin, async (req, res) => {
  if (!aiReport) aiReport = new AIReport();
  const report = aiReport.generateDailyReport();
  res.json({ success: true, report });
});

app.post('/api/v1/report/send', requireAdmin, async (req, res) => {
  if (!aiReport) aiReport = new AIReport();
  const report = aiReport.generateDailyReport();
  await aiReport.sendReportToWeChat(report);
  res.json({ success: true, message: '报告已发送' });
});

// ========== v4.3.0 新增：数据校验和实时监听 ==========
let dataValidator;
let dataWatcher;

app.post('/api/v1/validate/data', requireAdmin, async (req, res) => {
  if (!dataValidator) dataValidator = new DataValidator();
  const { dishes, inventory, members, orders } = req.body;
  const result = await dataValidator.validateAllData(dishes, inventory, members, orders);
  const report = dataValidator.generateReport();
  res.json({ success: true, result, report });
});

app.get('/api/v1/watcher/status', requireAdmin, async (req, res) => {
  if (dataWatcher) {
    res.json({ success: true, status: dataWatcher.getStatus(), log: dataWatcher.getChangeLog(20) });
  } else {
    res.json({ success: true, status: { isWatching: false } });
  }
});

app.post('/api/v1/watcher/start', requireAdmin, async (req, res) => {
  try {
    const adapterManager = getAdapterManager();
    const activeAdapter = adapterManager.getActiveAdapter();
    
    if (!activeAdapter) {
      return res.json({ success: false, message: '请先激活收银适配器' });
    }

    if (!dataWatcher) {
      dataWatcher = new DataWatcher(activeAdapter);
    }

    await dataWatcher.startWatching(req.body.interval || 10000);
    res.json({ success: true, message: '实时监听已启动' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/v1/watcher/stop', requireAdmin, async (req, res) => {
  if (dataWatcher) {
    dataWatcher.stopWatching();
    res.json({ success: true, message: '实时监听已停止' });
  } else {
    res.json({ success: false, message: '监听未启动' });
  }
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ success: false, code: 1004, message: '接口不存在' });
  } else {
    res.status(404).sendFile(path.join(__dirname, 'web', '404.html'));
  }
});

app.use(errorHandler);

cron.schedule('0 3 * * *', async () => {
  logger.info('开始执行定时备份...');
  try {
    await backupService.backupDatabase();
    logger.info('定时备份完成');
  } catch (error) {
    logger.error('定时备份失败:', error);
  }
});

cron.schedule('0 0 * * *', async () => {
  logger.info('检查微信支付证书有效期...');
  try {
    const certificateExpiry = process.env.WECHAT_CERT_EXPIRY;
    if (certificateExpiry) {
      const expiryDate = new Date(certificateExpiry);
      const daysRemaining = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
      if (daysRemaining <= 30) {
        logger.warn(`微信支付证书即将过期，剩余${daysRemaining}天`);
      }
    }
  } catch (error) {
    logger.error('检查证书有效期失败:', error);
  }
});

cron.schedule('0 2 * * 0', async () => {
  logger.info('开始执行数据库索引优化...');
  try {
    const { databaseMonitor } = require('./services/databaseMonitor');
    await databaseMonitor.optimizeIndexes();
    logger.info('数据库索引优化完成');
  } catch (error) {
    logger.error('数据库索引优化失败:', error);
  }
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  try {
    const circuitBreaker = require('./services/circuitBreaker');
    logger.info('熔断器服务已初始化');

    if (process.env.DB_HOST) {
      await db.initialize();
      logger.info('MySQL数据库连接成功');
    } else {
      await db.initialize();
      logger.info('SQLite数据库连接成功（无需安装MySQL，开箱即用）');
    }

    try {
      const { diskMonitor } = require('./services/diskMonitor');
      diskMonitor.start(60 * 1000);
      logger.info('磁盘监控已启动');
    } catch (error) {
      logger.warn('磁盘监控启动失败:', error.message);
    }

    try {
      const { systemMonitor } = require('./services/systemMonitor');
      systemMonitor.start(60 * 1000);
      logger.info('系统资源监控已启动');
    } catch (error) {
      logger.warn('系统资源监控启动失败:', error.message);
    }

    try {
      const { databaseMonitor } = require('./services/databaseMonitor');
      databaseMonitor.start();
      logger.info('数据库连接池监控已启动');
    } catch (error) {
      logger.warn('数据库连接池监控启动失败:', error.message);
    }

    app.listen(PORT, HOST, () => {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🤖  雨姗AI收银助手 - 自然语义智能体 v5.0.0');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`🚀 服务已启动: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
      console.log(`📱 顾客端: http://localhost:${PORT}/`);
      console.log(`📲 移动端: http://localhost:${PORT}/mobile`);
      console.log(`⚙️  管理端: http://localhost:${PORT}/admin`);
      console.log(`🔌 API基础: http://localhost:${PORT}/api/v1`);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('✅ v4.2 可插拔适配器架构: 支持主流收银系统对接');
      console.log('✅ v4.3 MCP工具扩展: AI Agent可调用收银接口');
      console.log('✅ v4.3 自然语义理解: 大白话点餐，意图识别');
      console.log('✅ v4.3 上下文记忆增强: 记住口味、历史订单');
      console.log('✅ v4.3 AI主动技能: 迎宾、推荐、提醒');
      console.log('✅ v4.3 企业微信机器人: 扣子平台，语音点餐');
      console.log('✅ v4.3 自动转人工: 复杂问题自动转人工客服');
      console.log('✅ v4.3 AI经营简报: 每日自动生成分析报告');
      console.log('✅ v5.0 配置向导: 一键配置收银对接');
      console.log('✅ v5.0 数据安全: AES-256加密存储');
      console.log('✅ v5.0 绿色部署: Windows绿色版开箱即用');
      console.log('✅ v5.0 安全增强: 速率限制、XSS/CSRF防护');
      console.log('═══════════════════════════════════════════════════════════');
      logger.info('服务启动成功', { port: PORT, host: HOST, version: '5.0.0' });
    });
  } catch (error) {
    logger.error('服务启动失败:', error);
    console.error('服务启动失败:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('收到SIGTERM信号，正在关闭服务...');
  try {
    const { diskMonitor } = require('./services/diskMonitor');
    diskMonitor.stop();
  } catch (e) {}
  try {
    const { systemMonitor } = require('./services/systemMonitor');
    systemMonitor.stop();
  } catch (e) {}
  try {
    const { databaseMonitor } = require('./services/databaseMonitor');
    databaseMonitor.stop();
  } catch (e) {}
  await db.close();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常', { error: error.message, stack: error.stack, name: error.name, timestamp: new Date().toISOString() });
  if (error.message && error.message.includes('printer')) {
    logger.warn('打印机异常，但服务继续运行');
    return;
  }
  if (process.env.NODE_ENV === 'production') {
    console.error('发生严重错误，服务将在重启后恢复');
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝', { reason: String(reason), timestamp: new Date().toISOString() });
});

startServer();

module.exports = app;