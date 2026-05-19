const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/migrate.log' }),
    new winston.transports.Console()
  ]
});

const MIGRATIONS = [
  {
    name: 'create_users_table',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone VARCHAR(20) UNIQUE,
        wechat_openid VARCHAR(100) UNIQUE,
        nickname VARCHAR(50),
        avatar VARCHAR(255),
        password_hash VARCHAR(255),
        points INT DEFAULT 0,
        balance DECIMAL(10, 2) DEFAULT 0.00,
        level INT DEFAULT 1,
        status ENUM('active', 'inactive', 'banned') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_phone (phone),
        INDEX idx_wechat (wechat_openid),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
  },
  {
    name: 'create_dishes_table',
    sql: `
      CREATE TABLE IF NOT EXISTS dishes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        name_en VARCHAR(100),
        category VARCHAR(50) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        original_price DECIMAL(10, 2),
        description TEXT,
        image VARCHAR(255),
        stock INT DEFAULT -1,
        stock_warning INT DEFAULT 10,
        ingredients TEXT,
        allergens TEXT,
        spicy_level INT DEFAULT 0,
        is_recommended BOOLEAN DEFAULT FALSE,
        is_available BOOLEAN DEFAULT TRUE,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_price (price),
        INDEX idx_available (is_available),
        INDEX idx_recommended (is_recommended)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
  },
  {
    name: 'create_orders_table',
    sql: `
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_no VARCHAR(32) UNIQUE NOT NULL,
        user_id INT,
        type ENUM('dine_in', 'takeout', 'delivery') DEFAULT 'dine_in',
        status ENUM('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled') DEFAULT 'pending',
        total_amount DECIMAL(10, 2) NOT NULL,
        discount_amount DECIMAL(10, 2) DEFAULT 0.00,
        final_amount DECIMAL(10, 2) NOT NULL,
        points_used INT DEFAULT 0,
        points_earned INT DEFAULT 0,
        coupon_id INT,
        payment_method ENUM('wechat', 'alipay', 'cash', 'balance') DEFAULT 'wechat',
        payment_status ENUM('unpaid', 'paid', 'refunded') DEFAULT 'unpaid',
        payment_no VARCHAR(64),
        table_no VARCHAR(20),
        guest_count INT DEFAULT 1,
        remarks TEXT,
        address VARCHAR(255),
        contact_phone VARCHAR(20),
        delivery_status VARCHAR(50),
        estimated_time INT,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_order_no (order_no),
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
  },
  {
    name: 'create_order_items_table',
    sql: `
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        dish_id INT NOT NULL,
        dish_name VARCHAR(100) NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE RESTRICT,
        INDEX idx_order_id (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
  },
  {
    name: 'create_coupons_table',
    sql: `
      CREATE TABLE IF NOT EXISTS coupons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        type ENUM('discount', 'cash') NOT NULL,
        value DECIMAL(10, 2) NOT NULL,
        min_amount DECIMAL(10, 2) DEFAULT 0.00,
        max_discount DECIMAL(10, 2),
        total_count INT NOT NULL,
        remaining_count INT NOT NULL,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        status ENUM('active', 'inactive', 'expired') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_code (code),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
  },
  {
    name: 'create_user_coupons_table',
    sql: `
      CREATE TABLE IF NOT EXISTS user_coupons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        coupon_id INT NOT NULL,
        status ENUM('unused', 'used', 'expired') DEFAULT 'unused',
        used_at TIMESTAMP NULL,
        order_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
  },
  {
    name: 'create_points_log_table',
    sql: `
      CREATE TABLE IF NOT EXISTS points_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type ENUM('earn', 'redeem', 'expire', 'adjust') NOT NULL,
        points INT NOT NULL,
        balance INT NOT NULL,
        order_id INT,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
  },
  {
    name: 'create_replenish_log_table',
    sql: `
      CREATE TABLE IF NOT EXISTS replenish_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        dish_id INT NOT NULL,
        quantity INT NOT NULL,
        type ENUM('add', 'deduct', 'adjust') NOT NULL,
        operator_id INT,
        reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
        INDEX idx_dish_id (dish_id),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
  },
  {
    name: 'create_stores_table',
    sql: `
      CREATE TABLE IF NOT EXISTS stores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        name_en VARCHAR(100),
        address VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        business_hours VARCHAR(100),
        lat DECIMAL(10, 8),
        lng DECIMAL(11, 8),
        image VARCHAR(255),
        description TEXT,
        status ENUM('active', 'inactive') DEFAULT 'active',
        is_default BOOLEAN DEFAULT FALSE,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_location (lat, lng)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
  },
  {
    name: 'create_store_settings_table',
    sql: `
      CREATE TABLE IF NOT EXISTS store_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        store_id INT NOT NULL,
        setting_key VARCHAR(100) NOT NULL,
        setting_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
        UNIQUE KEY unique_store_setting (store_id, setting_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
  },
  {
    name: 'create_delivery_drivers_table',
    sql: `
      CREATE TABLE IF NOT EXISTS delivery_drivers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        wechat_id VARCHAR(100),
        avatar VARCHAR(255),
        status ENUM('online', 'offline', 'busy') DEFAULT 'offline',
        current_lat DECIMAL(10, 8),
        current_lng DECIMAL(11, 8),
        total_deliveries INT DEFAULT 0,
        rating DECIMAL(3, 2) DEFAULT 5.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_location (current_lat, current_lng)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
  },
  {
    name: 'create_deliveries_table',
    sql: `
      CREATE TABLE IF NOT EXISTS deliveries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        delivery_no VARCHAR(32) UNIQUE NOT NULL,
        order_id INT NOT NULL,
        driver_id INT,
        address VARCHAR(255) NOT NULL,
        contact_phone VARCHAR(20) NOT NULL,
        contact_name VARCHAR(50),
        status ENUM('pending', 'assigned', 'picking_up', 'delivering', 'completed', 'cancelled') DEFAULT 'pending',
        current_location JSON,
        estimated_time INT,
        actual_time INT,
        picked_up_at TIMESTAMP NULL,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        assigned_at TIMESTAMP NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (driver_id) REFERENCES delivery_drivers(id) ON DELETE SET NULL,
        INDEX idx_delivery_no (delivery_no),
        INDEX idx_driver_id (driver_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
  },
  {
    name: 'create_notifications_table',
    sql: `
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        type ENUM('wechat', 'sms', 'push') NOT NULL,
        template_code VARCHAR(50),
        recipient VARCHAR(100) NOT NULL,
        title VARCHAR(100),
        content TEXT,
        data JSON,
        status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
        sent_at TIMESTAMP NULL,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
  },
  {
    name: 'create_queues_table',
    sql: `
      CREATE TABLE IF NOT EXISTS queues (
        id INT AUTO_INCREMENT PRIMARY KEY,
        queue_id VARCHAR(50) UNIQUE NOT NULL,
        store_id INT NOT NULL,
        user_id INT,
        table_type ENUM('small', 'medium', 'large', '包间') NOT NULL,
        people INT NOT NULL,
        queue_no VARCHAR(20) NOT NULL,
        status ENUM('waiting', 'called', 'completed', 'cancelled', 'no_show') DEFAULT 'waiting',
        wait_count INT DEFAULT 1,
        estimated_time INT DEFAULT 0,
        note TEXT,
        called_at TIMESTAMP NULL,
        completed_at TIMESTAMP NULL,
        cancelled_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_queue_id (queue_id),
        INDEX idx_store_id (store_id),
        INDEX idx_status (status),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
  }
];

async function runMigrations() {
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

    logger.info('开始执行数据库迁移...');

    for (const migration of MIGRATIONS) {
      logger.info(`执行迁移: ${migration.name}`);
      await connection.query(migration.sql);
      logger.info(`迁移完成: ${migration.name}`);
    }

    logger.info('所有数据库迁移已完成');
  } catch (error) {
    logger.error('迁移失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runMigrations };
