#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log('🍜 初始化SQLite数据库...\n');

const dbPath = path.join(__dirname, 'data', 'cashier.db');
const dataDir = path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

console.log('📦 创建数据表...');

db.exec(`
  -- 菜品分类表
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 菜品表
  CREATE TABLE IF NOT EXISTS dishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT,
    image TEXT,
    is_available INTEGER DEFAULT 1,
    is_recommended INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  -- 桌台表
  CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    capacity INTEGER DEFAULT 4,
    status TEXT DEFAULT 'available',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 订单表
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_id INTEGER,
    order_number TEXT UNIQUE,
    customer_count INTEGER DEFAULT 1,
    total_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (table_id) REFERENCES tables(id)
  );

  -- 订单明细表
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    dish_id INTEGER NOT NULL,
    dish_name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER DEFAULT 1,
    subtotal REAL NOT NULL,
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (dish_id) REFERENCES dishes(id)
  );

  -- 店铺配置表
  CREATE TABLE IF NOT EXISTS shop_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 会员表
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE,
    name TEXT,
    points INTEGER DEFAULT 0,
    level TEXT DEFAULT 'bronze',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log('✅ 数据表创建完成\n');

console.log('📝 插入示例数据...');

// 插入分类
const categories = [
  { name: '招牌面食', sort_order: 1 },
  { name: '精美小菜', sort_order: 2 },
  { name: '饮料酒水', sort_order: 3 },
  { name: '特色套餐', sort_order: 4 }
];

const insertCategory = db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)');
categories.forEach(cat => {
  insertCategory.run(cat.name, cat.sort_order);
});

console.log('✅ 分类数据插入完成');

// 插入菜品
const dishes = [
  // 面食类
  { category_id: 1, name: '红烧牛肉面', price: 28, description: '精选上等牛肉，配以秘制红烧汤底', is_recommended: 1 },
  { category_id: 1, name: '番茄鸡蛋面', price: 18, description: '新鲜番茄配土鸡蛋，营养美味', is_recommended: 1 },
  { category_id: 1, name: '担担面', price: 16, description: '传统四川风味，麻辣鲜香' },
  { category_id: 1, name: '刀削面', price: 20, description: '手工刀削，劲道爽滑' },
  { category_id: 1, name: '兰州拉面', price: 22, description: '正宗兰州拉面，清汤牛肉' },
  { category_id: 1, name: '酸菜肉丝面', price: 18, description: '酸爽开胃，回味无穷' },

  // 小菜类
  { category_id: 2, name: '凉拌黄瓜', price: 8, description: '清脆爽口，开胃小菜' },
  { category_id: 2, name: '皮蛋豆腐', price: 12, description: '嫩滑可口，下饭神器' },
  { category_id: 2, name: '卤味拼盘', price: 18, description: '多种卤味，香气四溢' },
  { category_id: 2, name: '泡椒凤爪', price: 15, description: '酸辣可口，越吃越香' },

  // 饮料类
  { category_id: 3, name: '可口可乐', price: 6, description: '冰镇可乐，解渴解腻' },
  { category_id: 3, name: '雪碧', price: 6, description: '清新柠檬味' },
  { category_id: 3, name: '橙汁', price: 8, description: '鲜榨橙汁' },
  { category_id: 3, name: '农夫山泉', price: 4, description: '矿泉水' },
  { category_id: 3, name: '酸奶', price: 10, description: '原味酸奶' },

  // 套餐类
  { category_id: 4, name: '单人套餐', price: 35, description: '面食+小菜+饮料，经济实惠', is_recommended: 1 },
  { category_id: 4, name: '双人套餐', price: 65, description: '2份面食+2份小菜+2杯饮料，适合2人' },
  { category_id: 4, name: '全家福套餐', price: 120, description: '4份面食+4份小菜+4杯饮料，适合4人' }
];

const insertDish = db.prepare(
  'INSERT INTO dishes (category_id, name, price, description, is_recommended) VALUES (?, ?, ?, ?, ?)'
);

dishes.forEach(dish => {
  insertDish.run(
    dish.category_id,
    dish.name,
    dish.price,
    dish.description,
    dish.is_recommended || 0
  );
});

console.log('✅ 菜品数据插入完成');

// 插入桌台
const tables = [];
for (let i = 1; i <= 20; i++) {
  tables.push({ name: `${i}号桌`, capacity: i <= 10 ? 4 : 6 });
}

const insertTable = db.prepare('INSERT INTO tables (name, capacity) VALUES (?, ?)');
tables.forEach(table => {
  insertTable.run(table.name, table.capacity);
});

console.log('✅ 桌台数据插入完成');

// 插入店铺配置
const shopConfig = [
  { key: 'shop_name', value: '一碗面快餐店' },
  { key: 'wifi_name', value: 'YIMIAN' },
  { key: 'wifi_password', value: '88888888' },
  { key: 'open_time', value: '09:00' },
  { key: 'close_time', value: '21:00' },
  { key: 'address', value: '河南省商丘市夏邑县' },
  { key: 'phone', value: '0370-1234567' },
  { key: 'parking_info', value: '门口有免费停车位，约10个' },
  { key: 'takeout_enabled', value: '1' },
  { key: 'pack_enabled', value: '1' },
  { key: 'booking_enabled', value: '1' },
  { key: 'avg_consumption', value: '25元/人' }
];

const insertConfig = db.prepare('INSERT OR REPLACE INTO shop_config (key, value) VALUES (?, ?)');
shopConfig.forEach(config => {
  insertConfig.run(config.key, config.value);
});

console.log('✅ 店铺配置插入完成');

// 创建管理员账号（密码：admin123，需首次登录后修改）
const bcrypt = require('bcryptjs');
const hashedPassword = bcrypt.hashSync('admin123', 10);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'cashier',
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

db.prepare('INSERT OR IGNORE INTO users (username, password, role, name) VALUES (?, ?, ?, ?)')
  .run('admin', hashedPassword, 'super_admin', '管理员');

console.log('✅ 管理员账号创建完成\n');

db.close();

console.log('========================================');
console.log('✅ SQLite数据库初始化完成！');
console.log('========================================');
console.log('');
console.log('📊 初始化数据统计：');
console.log(`   • 菜品分类：${categories.length} 个`);
console.log(`   • 菜品数量：${dishes.length} 个`);
console.log(`   • 桌台数量：${tables.length} 个`);
console.log(`   • 店铺配置：${shopConfig.length} 项`);
console.log('');
console.log('🔐 管理员账号：');
console.log('   用户名：admin');
console.log('   密码：admin123');
console.log('   ⚠️  首次登录后请修改密码！');
console.log('');
console.log('📁 数据库文件位置：');
console.log(`   ${dbPath}`);
console.log('');
console.log('========================================');
