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

class MemoryDatabase {
  constructor() {
    this.data = {
      dishes: [],
      orders: [],
      members: [],
      carts: [],
      queues: [],
      tables: []
    };
    this.initSampleData();
  }

  initSampleData() {
    this.data.dishes = [
      { id: '1', name: '糖醋里脊', price: 48, category: '招牌菜', image: '/images/dish1.jpg', description: '酸甜可口，外酥里嫩', status: 'active' },
      { id: '2', name: '水煮肉片', price: 58, category: '特色硬菜', image: '/images/dish2.jpg', description: '麻辣鲜香，下饭神器', status: 'active' },
      { id: '3', name: '红烧茄子', price: 28, category: '家常炒菜', image: '/images/dish3.jpg', description: '软糯入味，经济实惠', status: 'active' },
      { id: '4', name: '西红柿炒蛋', price: 22, category: '家常炒菜', image: '/images/dish4.jpg', description: '经典家常菜', status: 'active' },
      { id: '5', name: '酸辣土豆丝', price: 18, category: '餐前开胃', image: '/images/dish5.jpg', description: '酸辣爽口，开胃必备', status: 'active' },
      { id: '6', name: '宫保鸡丁', price: 42, category: '招牌菜', image: '/images/dish6.jpg', description: '香辣微甜，鸡肉嫩滑', status: 'active' },
      { id: '7', name: '鱼香肉丝', price: 38, category: '特色硬菜', image: '/images/dish7.jpg', description: '咸甜酸辣，四味俱全', status: 'active' },
      { id: '8', name: '紫菜蛋花汤', price: 15, category: '汤羹主食', image: '/images/dish8.jpg', description: '清淡营养', status: 'active' },
      { id: '9', name: '米饭', price: 3, category: '汤羹主食', image: '/images/rice.jpg', description: '东北大米，香软可口', status: 'active' },
      { id: '10', name: '米饭（大份）', price: 5, category: '汤羹主食', image: '/images/rice.jpg', description: '东北大米，香软可口', status: 'active' }
    ];

    this.data.members = [
      { id: 'm001', phone: '13800138000', name: '张三', level: 'gold', points: 500, balance: 200 },
      { id: 'm002', phone: '13900139000', name: '李四', level: 'silver', points: 200, balance: 50 }
    ];

    this.data.tables = [
      { id: 'A1', name: 'A1桌', capacity: 4, status: 'available' },
      { id: 'A2', name: 'A2桌', capacity: 4, status: 'available' },
      { id: 'A3', name: 'A3桌', capacity: 6, status: 'available' },
      { id: 'B1', name: 'B1包间', capacity: 10, status: 'available' },
      { id: 'B2', name: 'B2包间', capacity: 12, status: 'available' }
    ];

    logger.info('示例数据初始化完成');
  }

  async query(table, conditions = {}) {
    let results = [...(this.data[table] || [])];

    for (const [key, value] of Object.entries(conditions)) {
      results = results.filter(item => item[key] === value);
    }

    return results;
  }

  async queryOne(table, conditions = {}) {
    const results = await this.query(table, conditions);
    return results[0] || null;
  }

  async insert(table, data) {
    const id = Date.now().toString();
    const item = { id, ...data };
    this.data[table].push(item);
    return item;
  }

  async update(table, id, data) {
    const index = this.data[table].findIndex(item => item.id === id);
    if (index !== -1) {
      this.data[table][index] = { ...this.data[table][index], ...data };
      return this.data[table][index];
    }
    return null;
  }

  async delete(table, id) {
    const index = this.data[table].findIndex(item => item.id === id);
    if (index !== -1) {
      this.data[table].splice(index, 1);
      return true;
    }
    return false;
  }

  async cacheGet(key) {
    return null;
  }

  async cacheSet(key, value, ttl = 3600) {
    return true;
  }

  async cacheDel(key) {
    return true;
  }

  async initialize() {
    logger.info('内存数据库初始化成功（演示模式）');
    return true;
  }

  async close() {
    logger.info('数据库连接已关闭');
  }

  getConnection() {
    return null;
  }

  async transaction(callback) {
    return await callback({
      execute: async (sql, params) => {
        return { affectedRows: 1 };
      }
    });
  }
}

module.exports = new MemoryDatabase();
