const BaseAdapter = require('./base-adapter');
const TicketParser = require('../services/ticket-parser');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/printer-security.log' }),
    new winston.transports.Console()
  ]
});

const MAX_TICKET_SIZE = 1024 * 10;
const MAX_LINE_LENGTH = 256;
const MAX_LINES = 100;
const MAX_ORDER_ITEMS = 50;

const ALLOWED_CHARS = /^[\x00-\xFF]*$/;

const RESERVED_CODES = [
  0x00,
  0x07,
  0x08,
  0x09,
  0x0A,
  0x0D,
  0x1B
];

const TICKET_FORMAT_PATTERNS = {
  orderNo: /^[A-Z0-9]{8,32}$/,
  price: /^\d+(?:\.\d{1,2})?$/,
  quantity: /^\d{1,3}$/,
  date: /^\d{4}[-/]\d{2}[-/]\d{2}/,
  time: /^\d{2}:\d{2}(?::\d{2})?$/
};

class PrinterAdapter extends BaseAdapter {
  constructor(config) {
    super(config);
    this.printers = config.printers || [];
    this.listener = null;
    this.parser = new TicketParser();
    this.capturedTickets = [];
    this.maxCapturedTickets = 100;
    this.lastCaptureTime = 0;
    this.captureInterval = 1000;
  }

  async connect() {
    try {
      console.log('🖨️  启动打印旁路监听...');
      console.log(`   监听端口: ${this.config.port || 9100}`);
      
      this.connected = true;
      this.startListening();
      return true;
    } catch (e) {
      console.error('❌ 打印监听启动失败:', e);
      logger.error('打印监听启动失败', { error: e.message });
      return false;
    }
  }

  validateTicketData(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      return { valid: false, error: '无效的小票数据' };
    }

    if (rawText.length > MAX_TICKET_SIZE) {
      logger.warn('小票数据超过最大长度限制', { length: rawText.length });
      return { valid: false, error: `小票数据过大 (${rawText.length} > ${MAX_TICKET_SIZE})` };
    }

    if (!ALLOWED_CHARS.test(rawText)) {
      logger.warn('小票数据包含非法字符');
      return { valid: false, error: '小票数据包含非法字符' };
    }

    const lines = rawText.split('\n');
    if (lines.length > MAX_LINES) {
      logger.warn('小票行数超过限制', { lines: lines.length });
      return { valid: false, error: `小票行数超过限制 (${lines.length} > ${MAX_LINES})` };
    }

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > MAX_LINE_LENGTH) {
        logger.warn(`小票第${i+1}行长度超限`, { length: lines[i].length });
        return { valid: false, error: `第${i+1}行长度超限` };
      }
    }

    const suspiciousPatterns = [
      /\x00/g,
      /(?:\x1B\[){5,}/g,
      /\x1B[^\x1B]{100,}/g,
      /(?:\x0D\x0A){10,}/g
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(rawText)) {
        logger.warn('检测到可疑的小票数据模式');
        return { valid: false, error: '检测到可疑数据模式' };
      }
    }

    return { valid: true };
  }

  sanitizeTicketData(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      return '';
    }

    let sanitized = rawText;

    sanitized = sanitized.substring(0, MAX_TICKET_SIZE);

    const lines = sanitized.split('\n');
    const sanitizedLines = lines.map(line => {
      return line.substring(0, MAX_LINE_LENGTH);
    });
    sanitized = sanitizedLines.join('\n').substring(0, MAX_TICKET_SIZE);

    for (const code of RESERVED_CODES) {
      const char = String.fromCharCode(code);
      if (code === 0x0A || code === 0x0D || code === 0x09) {
        continue;
      }
      sanitized = sanitized.split(char).join('');
    }

    sanitized = sanitized.replace(/[\x00-\x06\x0B\x0C\x0E-\x1F\x7F]/g, '');

    return sanitized;
  }

  validateOrderData(orderData) {
    if (!orderData || typeof orderData !== 'object') {
      return { valid: false, error: '无效的订单数据' };
    }

    if (!orderData.orderNo) {
      return { valid: false, error: '缺少订单号' };
    }

    if (!TICKET_FORMAT_PATTERNS.orderNo.test(orderData.orderNo)) {
      return { valid: false, error: '无效的订单号格式' };
    }

    if (orderData.items && Array.isArray(orderData.items)) {
      if (orderData.items.length > MAX_ORDER_ITEMS) {
        return { valid: false, error: `订单商品数量超过限制 (${orderData.items.length} > ${MAX_ORDER_ITEMS})` };
      }

      for (let i = 0; i < orderData.items.length; i++) {
        const item = orderData.items[i];
        
        if (!item.name || typeof item.name !== 'string' || item.name.length > 100) {
          return { valid: false, error: `第${i+1}个商品名称无效` };
        }

        if (item.price !== undefined) {
          if (!TICKET_FORMAT_PATTERNS.price.test(String(item.price))) {
            return { valid: false, error: `第${i+1}个商品价格无效` };
          }
        }

        if (item.quantity !== undefined) {
          if (!TICKET_FORMAT_PATTERNS.quantity.test(String(item.quantity))) {
            return { valid: false, error: `第${i+1}个商品数量无效` };
          }
        }
      }
    }

    if (orderData.totalAmount !== undefined) {
      if (!TICKET_FORMAT_PATTERNS.price.test(String(orderData.totalAmount))) {
        return { valid: false, error: '无效的订单总金额' };
      }
    }

    return { valid: true };
  }

  sanitizeOrderData(orderData) {
    if (!orderData || typeof orderData !== 'object') {
      return null;
    }

    const sanitized = { ...orderData };

    if (typeof sanitized.orderNo === 'string') {
      sanitized.orderNo = sanitized.orderNo.substring(0, 32).replace(/[^A-Z0-9]/g, '');
    }

    if (sanitized.items && Array.isArray(sanitized.items)) {
      sanitized.items = sanitized.items.slice(0, MAX_ORDER_ITEMS).map(item => {
        const sanitizedItem = { ...item };
        if (typeof sanitizedItem.name === 'string') {
          sanitizedItem.name = sanitizedItem.name.substring(0, 100);
        }
        if (typeof sanitizedItem.price === 'string') {
          sanitizedItem.price = parseFloat(sanitizedItem.price) || 0;
        }
        if (typeof sanitizedItem.quantity === 'string') {
          sanitizedItem.quantity = parseInt(sanitizedItem.quantity) || 1;
        }
        return sanitizedItem;
      });
    }

    if (typeof sanitized.totalAmount === 'string') {
      sanitized.totalAmount = parseFloat(sanitized.totalAmount) || 0;
    }

    return sanitized;
  }

  startListening() {
    console.log('📡 正在监听打印机数据...');
    this.listener = setInterval(() => {
      if (Math.random() > 0.7) {
        const now = Date.now();
        if (now - this.lastCaptureTime >= this.captureInterval) {
          this.simulateCapture();
          this.lastCaptureTime = now;
        }
      }
    }, 10000);
  }

  simulateCapture() {
    const sampleTicket = `雨姗AI收银助手
订单号：YS${Date.now()}
时间：${new Date().toLocaleString()}
---------------------------------
名称        数量    金额
宫保鸡丁    1       28
鱼香肉丝    1       26
---------------------------------
总计：54`;
    this.captureTicket(sampleTicket);
  }

  captureTicket(rawText) {
    const validation = this.validateTicketData(rawText);
    if (!validation.valid) {
      logger.warn('小票数据验证失败', { error: validation.error });
      return null;
    }

    const sanitized = this.sanitizeTicketData(rawText);
    
    console.log('📄 捕获到新小票');
    const parsed = this.parser.parse(sanitized);
    
    const orderValidation = this.validateOrderData(parsed);
    if (!orderValidation.valid) {
      logger.warn('解析后的订单数据验证失败', { error: orderValidation.error });
      return null;
    }

    const sanitizedOrder = this.sanitizeOrderData(parsed);
    
    this.capturedTickets.push(sanitizedOrder);
    if (this.capturedTickets.length > this.maxCapturedTickets) {
      this.capturedTickets.shift();
    }
    
    console.log('✅ 小票解析:', sanitizedOrder);
    return sanitizedOrder;
  }

  async getDishes() {
    return [];
  }

  async getInventory() {
    return [];
  }

  async getMembers() {
    return [];
  }

  async createOrder(orderData) {
    const validation = this.validateOrderData(orderData);
    if (!validation.valid) {
      logger.warn('创建订单失败 - 数据验证失败', { error: validation.error });
      throw new Error(validation.error);
    }

    const sanitizedOrder = this.sanitizeOrderData(orderData);
    
    console.log('📝 虚拟打印入单:', sanitizedOrder.orderNo);
    
    return {
      ...sanitizedOrder,
      externalId: `printer-order-${Date.now()}`,
      printed: true
    };
  }

  async updateOrderStatus(orderId, status) {
    if (!orderId || typeof orderId !== 'string') {
      logger.warn('无效的订单ID');
      return false;
    }

    const sanitizedOrderId = orderId.substring(0, 50);
    
    const allowedStatuses = ['CONFIRMED', 'COOKING', 'READY', 'COMPLETED', 'CANCELLED'];
    if (!allowedStatuses.includes(status)) {
      logger.warn('无效的订单状态', { status });
      return false;
    }

    return true;
  }

  async syncPaymentStatus(orderId) {
    if (!orderId || typeof orderId !== 'string') {
      logger.warn('无效的订单ID');
      return { success: false, error: '无效的订单ID' };
    }

    const sanitizedOrderId = orderId.substring(0, 50);
    
    return { orderId: sanitizedOrderId, paid: true };
  }

  getCapturedTickets() {
    return this.capturedTickets;
  }

  static async detect(env) {
    return env.printers?.length > 0;
  }

  static getConfigSchema() {
    return [
      { name: 'listenPort', type: 'number', label: '监听端口', default: 9100, min: 1, max: 65535 },
      { name: 'printerType', type: 'select', label: '打印机类型', options: ['network', 'serial', 'usb'] },
      { name: 'maxTicketSize', type: 'number', label: '最大小票大小(KB)', default: 10, min: 1, max: 100 },
      { name: 'captureInterval', type: 'number', label: '捕获间隔(ms)', default: 1000, min: 100, max: 60000 }
    ];
  }
}

module.exports = PrinterAdapter;