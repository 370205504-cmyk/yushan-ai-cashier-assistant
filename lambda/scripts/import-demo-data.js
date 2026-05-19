#!/usr/bin/env node
/**
 * 演示数据导入脚本
 * 使用方法：node import-data.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

console.log('🚀 开始导入演示数据...\n');

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'yushan_restaurant',
  charset: 'utf8mb4'
};

console.log('📊 数据库配置：');
console.log(`  Host: ${dbConfig.host}`);
console.log(`  Database: ${dbConfig.database}\n`);

// 演示门店数据
const stores = [
  {
    name: '雨姗AI收银助手创味菜 - 旗舰店',
    short_name: '旗舰店',
    district: '县',
    area: '县中心商业区',
    address: '河南省商丘市县府前路188号',
    phone: '0370-628-9999',
    business_hours: '09:00-22:00',
    lat: 34.2334,
    lng: 116.1298,
    features: JSON.stringify(['旗舰店', '面积最大', '菜品最全', 'VIP包间', '支持婚宴', 'WiFi覆盖', '打印服务']),
    table_count: 35,
    has_wifi: 1,
    wifi_name: 'XYYP_005_VIP',
    wifi_password: '99999999',
    has_parking: 1,
    parking_info: '免费停车场，车位充足',
    can_deliver: 1,
    delivery_range: 6,
    can_reserve: 1,
    has_printer: 1,
    printer_model: '爱普生 TM-T82X',
    has_self_order: 1,
    rating: 4.9,
    status: 'active',
    is_default: 1,
    sort_order: 1
  },
  {
    name: '雨姗AI收银助手创味菜 - 县城中心店',
    short_name: '中心店',
    district: '县',
    area: '县中心商业区',
    address: '河南省商丘市县县城中路128号',
    phone: '0370-628-8888',
    business_hours: '09:00-21:00',
    lat: 34.2311,
    lng: 116.1315,
    features: JSON.stringify(['招牌店', '菜品最全', '有包间', '支持外卖', 'WiFi覆盖', '打印服务']),
    table_count: 25,
    has_wifi: 1,
    wifi_name: 'XYYP_001_Guest',
    wifi_password: '88888888',
    has_parking: 1,
    parking_info: '免费停车场',
    can_deliver: 1,
    delivery_range: 5,
    can_reserve: 1,
    has_printer: 1,
    printer_model: '爱普生 TM-T82X',
    has_self_order: 1,
    rating: 4.8,
    status: 'active',
    is_default: 0,
    sort_order: 2
  }
];

// 门店设置数据
const storeSettings = [
  { key: 'power_bank_available', value: '1', desc: '是否有充电宝' },
  { key: 'power_bank_brand', value: '街电', desc: '充电宝品牌' },
  { key: 'pet_friendly', value: '0', desc: '是否允许宠物' },
  { key: 'kids_friendly', value: '1', desc: '是否提供儿童服务' },
  { key: 'kids_high_chair', value: '1', desc: '是否有儿童椅' },
  { key: 'invoice_available', value: '1', desc: '是否可开发票' },
  { key: 'invoice_type', value: '增值税普通发票', desc: '发票类型' },
  { key: 'takeout_available', value: '1', desc: '是否支持打包' },
  { key: 'takeout_fee', value: '0', desc: '打包费' },
  { key: 'minimum_order', value: '20', desc: '最低起送价' },
  { key: 'delivery_fee', value: '3', desc: '配送费' }
];

// 活动公告数据
const announcements = [
  {
    title: '开业优惠',
    content: '雨姗AI收银助手创味菜旗舰店开业啦！全场8.8折，满100送20优惠券，欢迎光临！',
    type: 'promotion',
    start_time: new Date().toISOString().split('T')[0],
    end_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    is_active: 1,
    sort_order: 1
  },
  {
    title: '温馨提示',
    content: '尊敬的顾客，本店提供免费WiFi和充电宝服务，WiFi密码：88888888',
    type: 'notice',
    start_time: null,
    end_time: null,
    is_active: 1,
    sort_order: 2
  },
  {
    title: '会员日活动',
    content: '每周三会员日，会员消费双倍积分，更有专属优惠！',
    type: 'activity',
    start_time: new Date().toISOString().split('T')[0],
    end_time: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    is_active: 1,
    sort_order: 3
  }
];

async function importData() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功\n');

    // 导入门店数据
    console.log('📋 导入门店数据...');
    for (const store of stores) {
      const [result] = await connection.execute(`
        INSERT INTO stores (
          name, short_name, district, area, address, phone, business_hours,
          lat, lng, features, table_count, has_wifi, wifi_name, wifi_password,
          has_parking, parking_info, can_deliver, delivery_range,
          can_reserve, has_printer, printer_model, has_self_order,
          rating, status, is_default, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE updated_at = NOW()
      `, [
        store.name, store.short_name, store.district, store.area, store.address,
        store.phone, store.business_hours, store.lat, store.lng, store.features,
        store.table_count, store.has_wifi, store.wifi_name, store.wifi_password,
        store.has_parking, store.parking_info, store.can_deliver, store.delivery_range,
        store.can_reserve, store.has_printer, store.printer_model, store.has_self_order,
        store.rating, store.status, store.is_default, store.sort_order
      ]);
      console.log(`  ✅ ${store.name}`);
    }

    // 获取已插入的门店ID
    const [storeRows] = await connection.execute('SELECT id, name FROM stores ORDER BY id ASC');
    const storeIds = storeRows.map(s => s.id);
    console.log(`\n🆔 门店ID: ${storeIds.join(', ')}\n`);

    // 导入门店设置
    console.log('⚙️  导入门店设置...');
    for (let i = 0; i < storeIds.length; i++) {
      const storeId = storeIds[i];
      for (const setting of storeSettings) {
        await connection.execute(`
          INSERT INTO store_settings (store_id, setting_key, setting_value, description)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
        `, [storeId, setting.key, setting.value, setting.desc]);
      }
      console.log(`  ✅ 门店 ${storeIds[i]} 设置`);
    }

    // 导入活动公告
    console.log('\n📢 导入活动公告...');
    for (const announcement of announcements) {
      await connection.execute(`
        INSERT INTO announcements (
          store_id, title, content, type, start_time, end_time, is_active, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE updated_at = NOW()
      `, [
        null,
        announcement.title,
        announcement.content,
        announcement.type,
        announcement.start_time,
        announcement.end_time,
        announcement.is_active,
        announcement.sort_order
      ]);
      console.log(`  ✅ ${announcement.title}`);
    }

    console.log('\n🎉 演示数据导入成功！');
    console.log(`\n📊 导入统计：`);
    console.log(`  - 门店: ${stores.length} 家`);
    console.log(`  - 门店设置: ${storeIds.length * storeSettings.length} 条`);
    console.log(`  - 活动公告: ${announcements.length} 条`);

    console.log('\n✅ 完成！');

  } catch (error) {
    console.error('❌ 导入失败:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 提示：请确保MySQL数据库正在运行');
      console.error('   可以使用 Docker Compose 启动数据库：docker-compose up -d mysql');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

importData();
