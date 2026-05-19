const mysql = require('mysql2/promise');
const path = require('path');

const SAMPLE_DATA = {
  stores: [
    {
      id: 1,
      name: '雨姗AI收银助手创味菜(孔祖店)',
      name_en: 'Yushan AI Cashier Assistant Restaurant',
      address: '县孔祖大道南段188号',
      phone: '0370-6288888',
      business_hours: '10:00-22:00',
      lat: 34.238,
      lng: 116.081,
      description: '雨姗AI收银助手创味菜，精选食材，美味可口',
      is_default: true,
      status: 'active'
    },
    {
      id: 2,
      name: '雨姗AI收银助手创味菜(雪枫路店)',
      name_en: 'Yushan AI Cashier Assistant Restaurant',
      address: '县雪枫路中段66号',
      phone: '0370-6286666',
      business_hours: '10:00-22:00',
      lat: 34.241,
      lng: 116.079,
      description: '雨姗AI收银助手创味菜，精选食材，美味可口',
      is_default: false,
      status: 'active'
    }
  ],
  dishes: [
    { id: 1, name: '招牌红烧肉', name_en: 'Signature Pork Belly', category: '招牌菜', price: 58.00, stock: 100, is_recommended: true, description: '精选五花肉，肥而不腻', spicy_level: 0 },
    { id: 2, name: '糖醋里脊', name_en: 'Sweet & Sour Pork', category: '招牌菜', price: 48.00, stock: 80, is_recommended: true, description: '外酥里嫩，酸甜可口', spicy_level: 0 },
    { id: 3, name: '宫保鸡丁', name_en: 'Kung Pao Chicken', category: '特色硬菜', price: 42.00, stock: 120, description: '经典川菜，麻辣鲜香', spicy_level: 2 },
    { id: 4, name: '水煮牛肉', name_en: 'Poached Sliced Beef', category: '特色硬菜', price: 56.00, stock: 90, description: '麻辣鲜香，肉质嫩滑', spicy_level: 3 },
    { id: 5, name: '鱼香肉丝', name_en: 'Yuxiang Shredded Pork', category: '家常炒菜', price: 32.00, stock: 150, description: '经典家常菜，酸甜咸香', spicy_level: 1 },
    { id: 6, name: '麻婆豆腐', name_en: 'Mapo Tofu', category: '家常炒菜', price: 28.00, stock: 200, description: '麻辣鲜香，豆腐嫩滑', spicy_level: 2 },
    { id: 7, name: '酸辣汤', name_en: 'Hot & Sour Soup', category: '汤羹/主食/饮品', price: 18.00, stock: 300, description: '开胃爽口', spicy_level: 2 },
    { id: 8, name: '番茄蛋汤', name_en: 'Tomato & Egg Soup', category: '汤羹/主食/饮品', price: 12.00, stock: 500, description: '鲜美可口', spicy_level: 0 }
  ],
  coupons: [
    {
      id: 1,
      code: 'WELCOME10',
      name: '新用户专享券',
      type: 'cash',
      value: 10.00,
      min_amount: 50.00,
      total_count: 100,
      remaining_count: 100,
      status: 'active'
    },
    {
      id: 2,
      code: 'VIP20',
      name: '会员专享折扣券',
      type: 'discount',
      value: 80.00,
      min_amount: 100.00,
      total_count: 50,
      remaining_count: 50,
      status: 'active'
    }
  ],
  delivery_drivers: [
    {
      id: 1,
      name: '张师傅',
      phone: '13800138001',
      status: 'online',
      rating: 4.9,
      total_deliveries: 150,
      current_lat: 34.239,
      current_lng: 116.080
    },
    {
      id: 2,
      name: '李师傅',
      phone: '13800138002',
      status: 'offline',
      rating: 4.8,
      total_deliveries: 120,
      current_lat: 34.240,
      current_lng: 116.078
    }
  ],
  users: [
    {
      id: 1,
      phone: '13800138000',
      nickname: '测试用户',
      points: 100,
      balance: 50.00,
      level: 1,
      status: 'active'
    }
  ]
};

async function importSampleData() {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });

  const logger = console;
  logger.log('========================================');
  logger.log('雨姗AI收银助手创味菜 - 导入示例数据');
  logger.log('========================================');

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'yushan_restaurant',
      multipleStatements: true
    });

    logger.log('');
    logger.log('1. 导入门店数据...');
    for (const store of SAMPLE_DATA.stores) {
      await connection.query(
        'INSERT IGNORE INTO stores (id, name, name_en, address, phone, ' +
        'business_hours, lat, lng, description, is_default, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [store.id, store.name, store.name_en, store.address, store.phone,
          store.business_hours, store.lat, store.lng, store.description, store.is_default, store.status]
      );
    }
    logger.log('   ✅ 门店数据导入完成');

    logger.log('');
    logger.log('2. 导入菜品数据...');
    for (const dish of SAMPLE_DATA.dishes) {
      await connection.query(
        'INSERT IGNORE INTO dishes (id, name, name_en, category, price, ' +
        'stock, is_recommended, description, spicy_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [dish.id, dish.name, dish.name_en, dish.category, dish.price,
          dish.stock, dish.is_recommended, dish.description, dish.spicy_level]
      );
    }
    logger.log('   ✅ 菜品数据导入完成');

    logger.log('');
    logger.log('3. 导入优惠券数据...');
    for (const coupon of SAMPLE_DATA.coupons) {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);
      await connection.query(
        'INSERT IGNORE INTO coupons (id, code, name, type, value, ' +
        'min_amount, total_count, remaining_count, status, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [coupon.id, coupon.code, coupon.name, coupon.type, coupon.value,
          coupon.min_amount, coupon.total_count, coupon.remaining_count, coupon.status, startDate, endDate]
      );
    }
    logger.log('   ✅ 优惠券数据导入完成');

    logger.log('');
    logger.log('4. 导入配送员数据...');
    for (const driver of SAMPLE_DATA.delivery_drivers) {
      await connection.query(
        'INSERT IGNORE INTO delivery_drivers (id, name, phone, status, ' +
        'rating, total_deliveries, current_lat, current_lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [driver.id, driver.name, driver.phone, driver.status, driver.rating,
          driver.total_deliveries, driver.current_lat, driver.current_lng]
      );
    }
    logger.log('   ✅ 配送员数据导入完成');

    logger.log('');
    logger.log('5. 导入测试用户数据...');
    const passwordHash = await require('bcryptjs').hash('123456', 10);
    for (const user of SAMPLE_DATA.users) {
      await connection.query(
        'INSERT IGNORE INTO users (id, phone, nickname, password_hash, ' +
        'points, balance, level, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [user.id, user.phone, user.nickname, passwordHash, user.points,
          user.balance, user.level, user.status]
      );
    }
    logger.log('   ✅ 测试用户导入完成');

    logger.log('');
    logger.log('========================================');
    logger.log('✅ 示例数据导入成功！');
    logger.log('');
    logger.log('测试账号信息：');
    logger.log('  手机号: 13800138000');
    logger.log('  密码: 123456');
    logger.log('  积分: 100');
    logger.log('  余额: ¥50.00');
    logger.log('');
    logger.log('优惠券兑换码：');
    logger.log('  WELCOME10 - 新用户专享券');
    logger.log('  VIP20 - 会员专享折扣券');
    logger.log('========================================');
  } catch (error) {
    logger.error('❌ 导入失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  importSampleData().catch(console.error);
}

module.exports = { importSampleData, SAMPLE_DATA };
