const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const db = require('./database/db');
const logger = require('./utils/logger');
const backupService = require('./database/backup');
const { AdapterManager, getAdapterManager } = require('./adapters');
const Detector = require('./services/detector');
const MCPHandler = require('./mcp/handler');
const WeWorkBot = require('./integrations/wework-bot');
const AIReport = require('./services/ai-report');
const DataValidator = require('./services/data-validator');
const DataWatcher = require('./services/data-watcher');

const dishesRoutes = require('./routes/dishes');
const orderRoutes = require('./routes/order');
const cartRoutes = require('./routes/cart');
const memberRoutes = require('./routes/member');
const storeRoutes = require('./routes/store');
const paymentRoutes = require('./routes/payment');
const paymentConfigRoutes = require('./routes/paymentConfig');
const adminRoutes = require('./routes/admin');
const monitorRoutes = require('./routes/monitor');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const wechatRoutes = require('./routes/wechat');
const analyticsRoutes = require('./routes/analytics');
const exportRoutes = require('./routes/export');
const deliveryRoutes = require('./routes/delivery');
const queueRoutes = require('./routes/queue');
const userDataRoutes = require('./routes/userData');
const agentRoutes = require('./routes/agent');
const llmConfigRoutes = require('./routes/llm-config');
const devSkillsRoutes = require('./routes/dev-skills');
const skillManagerRoutes = require('./routes/skill-manager');

const { apiLimiter, helmetConfig, corsConfig, inputSanitize, xssProtection, ipProtection, csrfProtection, agentLimiter } = require('./middleware/security');
const { requireAdmin, requireAuth } = require('./middleware/auth');
const session = require('express-session');
const RedisStore = require('connect-redis').default;

const isProduction = process.env.NODE_ENV === 'production';

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

app.use(helmetConfig);
app.use(corsConfig);
app.use(ipProtection);
app.use(inputSanitize);
app.use(xssProtection);
app.use(enforceHttps);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(session(sessionConfig));
app.use(csrfProtection);

app.use('/', express.static(path.join(__dirname, 'web'), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

app.use('/api/v1/dishes', dishesRoutes);
app.use('/api/v1/order', orderRoutes);
app.use('/api/v1/delivery', deliveryRoutes);
app.use('/api/v1/queue', queueRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/store', storeRoutes);
app.use('/api/v1/payment-config', paymentConfigRoutes);
app.use('/api/v1', apiLimiter, apiRoutes);
app.use('/agent', agentLimiter, requireAuth, agentRoutes);
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

app.get('/mobile', (req, res) => {
  res.sendFile(path.join(__dirname, 'web/mobile.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'web/admin.html'));
});

app.get('/setup', (req, res) => {
  res.sendFile(path.join(__dirname, 'web/setup.html'));
});

app.get('/llm-config', (req, res) => {
  res.sendFile(path.join(__dirname, 'web/llm-config.html'));
});

app.get('/api/v1/health', async (req, res) => {
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
  res.json({
    success: true,
    status: 'idle',
    lastSync: new Date().toISOString(),
    pendingOrders: 0
  });
});

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
  } else if (req.path.endsWith('.html')) {
    res.status(404).sendFile(path.join(__dirname, 'web/404.html'));
  } else {
    next();
  }
});

const errorHandler = (err, req, res, next) => {
  logger.error('未处理的错误:', err);
  res.status(500).json({ 
    success: false, 
    message: process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : err.message 
  });
};

app.use(errorHandler);

module.exports = app;
