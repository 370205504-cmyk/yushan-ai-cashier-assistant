-- 雨姗AI收银助手创味菜 - 数据库初始化脚本

-- 创建数据库
CREATE DATABASE IF NOT EXISTS yushan_restaurant CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE yushan_restaurant;

-- 门店表
CREATE TABLE IF NOT EXISTS stores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '门店名称',
  short_name VARCHAR(50) COMMENT '简称',
  district VARCHAR(50) COMMENT '区域',
  area VARCHAR(50) COMMENT '商圈',
  address VARCHAR(255) NOT NULL COMMENT '详细地址',
  phone VARCHAR(20) COMMENT '联系电话',
  business_hours VARCHAR(100) COMMENT '营业时间',
  lat DECIMAL(10, 6) COMMENT '纬度',
  lng DECIMAL(10, 6) COMMENT '经度',
  image VARCHAR(255) COMMENT '门店图片',
  description TEXT COMMENT '门店描述',
  features JSON COMMENT '门店特色(数组)',
  table_count INT DEFAULT 0 COMMENT '桌位数量',
  has_wifi TINYINT(1) DEFAULT 1 COMMENT '是否有WiFi',
  wifi_name VARCHAR(100) COMMENT 'WiFi名称',
  wifi_password VARCHAR(100) COMMENT 'WiFi密码',
  has_parking TINYINT(1) DEFAULT 0 COMMENT '是否有停车场',
  parking_info VARCHAR(255) COMMENT '停车说明',
  can_deliver TINYINT(1) DEFAULT 0 COMMENT '是否支持外卖',
  delivery_range INT DEFAULT 3 COMMENT '配送范围(公里)',
  can_reserve TINYINT(1) DEFAULT 0 COMMENT '是否支持包间预订',
  has_printer TINYINT(1) DEFAULT 0 COMMENT '是否有打印机',
  printer_model VARCHAR(100) COMMENT '打印机型号',
  has_self_order TINYINT(1) DEFAULT 1 COMMENT '是否支持自助点餐',
  rating DECIMAL(2, 1) DEFAULT 4.5 COMMENT '评分',
  status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
  is_default TINYINT(1) DEFAULT 0 COMMENT '是否为默认门店',
  sort_order INT DEFAULT 0 COMMENT '排序',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_location (lat, lng),
  INDEX idx_default (is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入示例门店数据
INSERT INTO stores (name, short_name, district, area, address, phone, business_hours, lat, lng, features, table_count, has_wifi, wifi_name, wifi_password, has_parking, can_deliver, delivery_range, can_reserve, has_printer, has_self_order, rating, is_default, sort_order) VALUES
('雨姗AI收银助手创味菜 - 旗舰店', '旗舰店', '县城', '县中心商业区', '河南省商丘市县府前路188号', '0370-628-9999', '09:00-22:00', 34.2334, 116.1298, '["旗舰店","面积最大","菜品最全","有VIP包间","支持外卖","支持婚宴","WiFi覆盖","打印服务","自主下单"]', 35, 1, 'XYYP_005_VIP', '99999999', 1, 1, 6, 1, 1, 1, 4.9, 1, 1),
('雨姗AI收银助手创味菜 - 县城中心店', '中心店', '县城', '县中心商业区', '河南省商丘市县县城中路128号', '0370-628-8888', '09:00-21:00', 34.2311, 116.1315, '["招牌店","菜品最全","有包间","支持外卖","WiFi覆盖","打印服务"]', 25, 1, 'XYYP_001_Guest', '88888888', 1, 1, 5, 1, 1, 1, 4.8, 0, 2),
('雨姗AI收银助手创味菜 - 城东店', '城东店', '县城', '城东开发区', '河南省商丘市县东环路56号', '0370-628-6666', '09:30-20:30', 34.2356, 116.1456, '["新店开业","环境优美","支持外卖","WiFi覆盖","打印服务"]', 18, 1, 'XYYP_002_WiFi', '66666666', 1, 1, 4, 1, 1, 1, 4.6, 0, 3),
('雨姗AI收银助手创味菜 - 城西店', '城西店', '县城', '城西老城区', '河南省商丘市县西环路89号', '0370-628-5555', '09:00-21:00', 34.2289, 116.1189, '["老字号","口味正宗","支持外卖","有包间","WiFi覆盖","打印服务"]', 20, 1, 'XYYP_003_Free', '55555555', 0, 1, 4, 1, 1, 1, 4.7, 0, 4),
('雨姗AI收银助手创味菜 - 城郊店', '城郊店', '城郊区域', '城郊工业区', '河南省商丘市县城郊工业园108号', '0370-628-4444', '10:00-20:00', 34.2412, 116.1089, '["支持外卖","快餐为主","价格实惠","WiFi覆盖","打印服务"]', 12, 1, 'XYYP_004', '44444444', 1, 1, 3, 0, 1, 1, 4.5, 0, 5);

-- 门店设置表
CREATE TABLE IF NOT EXISTS store_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store_id INT NOT NULL COMMENT '门店ID',
  setting_key VARCHAR(100) NOT NULL COMMENT '设置键',
  setting_value TEXT COMMENT '设置值',
  description VARCHAR(255) COMMENT '设置说明',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_store_key (store_id, setting_key),
  INDEX idx_store_id (store_id),
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 用户门店偏好表
CREATE TABLE IF NOT EXISTS user_store_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL UNIQUE COMMENT '用户ID',
  current_store_id INT COMMENT '当前选择的门店ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (current_store_id) REFERENCES stores(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入默认门店设置
INSERT INTO store_settings (store_id, setting_key, setting_value, description) VALUES
(1, 'power_bank_available', '1', '是否有充电宝服务'),
(1, 'power_bank_brand', '街电', '充电宝品牌'),
(1, 'pet_friendly', '0', '是否允许宠物'),
(1, 'kids_friendly', '1', '是否提供儿童服务'),
(1, 'kids_high_chair', '1', '是否有儿童椅'),
(1, 'invoice_available', '1', '是否可开发票'),
(1, 'invoice_type', '增值税普通发票', '发票类型'),
(1, 'takeout_available', '1', '是否支持打包'),
(1, 'takeout_fee', '0', '打包费'),
(1, 'minimum_order', '20', '最低起送价'),
(1, 'delivery_fee', '3', '配送费');

-- 全局支付配置表
CREATE TABLE IF NOT EXISTS payment_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store_id INT COMMENT '门店ID(为空则是全局配置)',
  config_type ENUM('wechat', 'alipay') NOT NULL COMMENT '配置类型',
  app_id VARCHAR(100) COMMENT '应用ID',
  app_secret VARCHAR(255) COMMENT '应用密钥',
  mch_id VARCHAR(100) COMMENT '商户号',
  mch_key VARCHAR(255) COMMENT '商户密钥',
  cert_path VARCHAR(255) COMMENT '证书路径',
  is_active TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_store_type (store_id, config_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 活动/公告表
CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store_id INT COMMENT '门店ID(为空则是全局)',
  title VARCHAR(200) NOT NULL COMMENT '标题',
  content TEXT COMMENT '内容',
  image VARCHAR(255) COMMENT '图片',
  type ENUM('activity', 'notice', 'promotion') DEFAULT 'notice' COMMENT '类型',
  start_time DATETIME COMMENT '开始时间',
  end_time DATETIME COMMENT '结束时间',
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_store_active (store_id, is_active),
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入示例活动
INSERT INTO announcements (title, content, type, is_active, sort_order) VALUES
('开业优惠', '雨姗AI收银助手创味菜旗舰店开业啦！全场8.8折，满100送20优惠券', 'promotion', 1, 1),
('温馨提示', '尊敬的顾客，本店提供免费WiFi和充电宝服务', 'notice', 1, 2),
('会员日活动', '每周三会员日，会员消费双倍积分', 'activity', 1, 3);

-- 外卖配送表
CREATE TABLE IF NOT EXISTS delivery_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_no VARCHAR(64) NOT NULL COMMENT '订单号',
  store_id INT NOT NULL COMMENT '门店ID',
  rider_name VARCHAR(50) COMMENT '骑手姓名',
  rider_phone VARCHAR(20) COMMENT '骑手电话',
  status ENUM('pending', 'accepted', 'picking', 'delivering', 'delivered', 'cancelled') DEFAULT 'pending' COMMENT '配送状态',
  estimated_arrival DATETIME COMMENT '预计送达时间',
  actual_arrival DATETIME COMMENT '实际送达时间',
  delivery_address TEXT NOT NULL COMMENT '配送地址',
  contact_name VARCHAR(50) NOT NULL COMMENT '联系人姓名',
  contact_phone VARCHAR(20) NOT NULL COMMENT '联系电话',
  delivery_fee DECIMAL(10,2) DEFAULT 0 COMMENT '配送费',
  distance DECIMAL(5,2) COMMENT '配送距离(公里)',
  tips DECIMAL(10,2) DEFAULT 0 COMMENT '小费',
  notes TEXT COMMENT '配送备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order_no (order_no),
  INDEX idx_store_status (store_id, status),
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 发票记录表
CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_no VARCHAR(64) NOT NULL COMMENT '订单号',
  store_id INT COMMENT '门店ID',
  user_id VARCHAR(64) COMMENT '用户ID',
  invoice_type ENUM('personal', 'company') NOT NULL COMMENT '发票类型',
  invoice_title VARCHAR(200) NOT NULL COMMENT '发票抬头',
  tax_number VARCHAR(50) COMMENT '税号',
  company_address VARCHAR(255) COMMENT '公司地址',
  company_phone VARCHAR(20) COMMENT '公司电话',
  bank_name VARCHAR(100) COMMENT '开户银行',
  bank_account VARCHAR(50) COMMENT '银行账号',
  amount DECIMAL(10,2) NOT NULL COMMENT '开票金额',
  items TEXT COMMENT '开票项目',
  status ENUM('pending', 'issued', 'sent', 'cancelled') DEFAULT 'pending' COMMENT '发票状态',
  pdf_url VARCHAR(255) COMMENT 'PDF文件URL',
  email VARCHAR(100) COMMENT '接收邮箱',
  phone VARCHAR(20) COMMENT '接收电话',
  remark TEXT COMMENT '备注',
  issued_at DATETIME COMMENT '开票时间',
  sent_at DATETIME COMMENT '发送时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order_no (order_no),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 打印配置表
CREATE TABLE IF NOT EXISTS printer_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store_id INT NOT NULL COMMENT '门店ID',
  name VARCHAR(100) NOT NULL COMMENT '打印机名称',
  model VARCHAR(100) COMMENT '打印机型号',
  type ENUM('receipt', 'kitchen', 'label') DEFAULT 'receipt' COMMENT '打印机类型',
  ip_address VARCHAR(50) COMMENT 'IP地址',
  port INT DEFAULT 9100 COMMENT '端口',
  serial_port VARCHAR(50) COMMENT '串口',
  baud_rate INT DEFAULT 115200 COMMENT '波特率',
  paper_width INT DEFAULT 80 COMMENT '纸宽(mm)',
  is_enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  is_default TINYINT(1) DEFAULT 0 COMMENT '是否默认',
  auto_print_order TINYINT(1) DEFAULT 1 COMMENT '自动打印订单',
  auto_print_payment TINYINT(1) DEFAULT 1 COMMENT '自动打印支付凭证',
  auto_print_kitchen TINYINT(1) DEFAULT 1 COMMENT '自动打印厨房单',
  config JSON COMMENT '高级配置',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_store (store_id),
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入打印配置
INSERT INTO printer_configs (store_id, name, model, type, ip_address, port, paper_width, is_enabled, is_default) VALUES
(1, '前台打印机', '爱普生 TM-T82X', 'receipt', '192.168.1.100', 9100, 80, 1, 1),
(1, '厨房打印机', '爱普生 TM-T82X', 'kitchen', '192.168.1.101', 9100, 80, 1, 0);

-- 消息队列表
CREATE TABLE IF NOT EXISTS message_queue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  queue_name VARCHAR(50) NOT NULL COMMENT '队列名称',
  message_type VARCHAR(50) NOT NULL COMMENT '消息类型',
  payload JSON NOT NULL COMMENT '消息内容',
  priority INT DEFAULT 0 COMMENT '优先级(0-10)',
  status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending' COMMENT '状态',
  retry_count INT DEFAULT 0 COMMENT '重试次数',
  max_retries INT DEFAULT 5 COMMENT '最大重试次数',
  last_error TEXT COMMENT '最后错误信息',
  available_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '可用时间',
  processed_at TIMESTAMP NULL COMMENT '处理时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_queue_status (queue_name, status),
  INDEX idx_priority (priority, available_at),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 系统监控表
CREATE TABLE IF NOT EXISTS system_metrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  metric_type VARCHAR(50) NOT NULL COMMENT '指标类型',
  metric_name VARCHAR(100) NOT NULL COMMENT '指标名称',
  metric_value DECIMAL(20,4) COMMENT '指标值',
  unit VARCHAR(20) COMMENT '单位',
  tags JSON COMMENT '标签',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_type_time (metric_type, created_at),
  INDEX idx_name_time (metric_name, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 告警规则表
CREATE TABLE IF NOT EXISTS alert_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '规则名称',
  description TEXT COMMENT '规则描述',
  metric_name VARCHAR(100) NOT NULL COMMENT '监控指标',
  condition ENUM('gt', 'lt', 'eq', 'gte', 'lte') NOT NULL COMMENT '条件',
  threshold DECIMAL(20,4) NOT NULL COMMENT '阈值',
  duration INT DEFAULT 60 COMMENT '持续时间(秒)',
  level ENUM('info', 'warning', 'error', 'critical') DEFAULT 'warning' COMMENT '告警级别',
  channels JSON COMMENT '通知渠道',
  is_enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 告警记录表
CREATE TABLE IF NOT EXISTS alert_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rule_id INT COMMENT '规则ID',
  alert_name VARCHAR(100) NOT NULL COMMENT '告警名称',
  level ENUM('info', 'warning', 'error', 'critical') NOT NULL COMMENT '告警级别',
  message TEXT NOT NULL COMMENT '告警消息',
  details JSON COMMENT '详细信息',
  is_resolved TINYINT(1) DEFAULT 0 COMMENT '是否已解决',
  resolved_at TIMESTAMP NULL COMMENT '解决时间',
  resolved_by VARCHAR(50) COMMENT '解决人',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_level (level),
  INDEX idx_resolved (is_resolved),
  INDEX idx_created (created_at),
  FOREIGN KEY (rule_id) REFERENCES alert_rules(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 数据库备份记录表
CREATE TABLE IF NOT EXISTS backup_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  backup_type ENUM('full', 'incremental') NOT NULL COMMENT '备份类型',
  file_path VARCHAR(255) NOT NULL COMMENT '文件路径',
  file_size BIGINT COMMENT '文件大小(字节)',
  checksum VARCHAR(64) COMMENT '校验和',
  status ENUM('completed', 'failed') NOT NULL COMMENT '状态',
  error_message TEXT COMMENT '错误信息',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_type_date (backup_type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 补充门店设置
INSERT INTO store_settings (store_id, setting_key, setting_value, description) VALUES
(2, 'power_bank_available', '1', '是否有充电宝服务'),
(2, 'power_bank_brand', '怪兽充电', '充电宝品牌'),
(2, 'pet_friendly', '0', '是否允许宠物'),
(2, 'kids_friendly', '1', '是否提供儿童服务'),
(2, 'invoice_available', '1', '是否可开发票'),
(3, 'power_bank_available', '1', '是否有充电宝服务'),
(3, 'power_bank_brand', '街电', '充电宝品牌'),
(3, 'pet_friendly', '1', '是否允许宠物'),
(3, 'kids_friendly', '1', '是否提供儿童服务'),
(3, 'invoice_available', '1', '是否可开发票'),
(4, 'power_bank_available', '0', '是否有充电宝服务'),
(4, 'pet_friendly', '0', '是否允许宠物'),
(4, 'invoice_available', '0', '是否可开发票'),
(5, 'power_bank_available', '1', '是否有充电宝服务'),
(5, 'power_bank_brand', '来电', '充电宝品牌'),
(5, 'pet_friendly', '0', '是否允许宠物'),
(5, 'kids_friendly', '1', '是否提供儿童服务'),
(5, 'invoice_available', '1', '是否可开发票');

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(64) UNIQUE NOT NULL COMMENT '用户唯一标识',
  phone VARCHAR(100) COMMENT '手机号(加密存储)',
  nickname VARCHAR(50) COMMENT '昵称',
  avatar VARCHAR(255) COMMENT '头像URL',
  openid VARCHAR(64) COMMENT '微信openid',
  role ENUM('user', 'admin') DEFAULT 'user',
  points INT DEFAULT 0 COMMENT '积分',
  balance DECIMAL(10,2) DEFAULT 0.00 COMMENT '余额',
  total_spent DECIMAL(10,2) DEFAULT 0.00 COMMENT '累计消费',
  address TEXT COMMENT '收货地址',
  password_changed TINYINT(1) DEFAULT 0 COMMENT '是否已修改初始密码',
  last_password_change TIMESTAMP NULL COMMENT '最后密码修改时间',
  last_login TIMESTAMP NULL COMMENT '最后登录时间',
  login_attempts INT DEFAULT 0 COMMENT '连续登录失败次数',
  locked_until TIMESTAMP NULL COMMENT '账户锁定截止时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_phone (phone),
  INDEX idx_openid (openid),
  INDEX idx_locked (locked_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 管理员用户（初始密码随机生成，首次登录必须修改）
INSERT INTO users (user_id, phone, nickname, role, password_changed) VALUES
('admin001', NULL, '系统管理员', 'admin', 0);

-- 菜品分类表
CREATE TABLE IF NOT EXISTS dish_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL COMMENT '分类名称',
  name_en VARCHAR(50) COMMENT '英文名',
  sort_order INT DEFAULT 0 COMMENT '排序',
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO dish_categories (name, sort_order) VALUES
('招牌菜', 1),
('特色硬菜', 2),
('宴请首选', 3),
('餐前开胃', 4),
('家常炒菜', 5),
('汤羹主食', 6),
('酒水饮料', 7);

-- 菜品表
CREATE TABLE IF NOT EXISTS dishes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '菜品名称',
  name_en VARCHAR(100) COMMENT '英文名',
  category_id INT COMMENT '分类ID',
  price DECIMAL(10,2) NOT NULL COMMENT '售价',
  original_price DECIMAL(10,2) COMMENT '原价',
  description TEXT COMMENT '描述',
  image VARCHAR(255) COMMENT '图片URL',
  stock INT DEFAULT -1 COMMENT '库存(-1表示不限库存)',
  stock_warning INT DEFAULT 10 COMMENT '库存预警值',
  ingredients TEXT COMMENT '食材',
  allergens TEXT COMMENT '过敏原',
  spicy_level TINYINT DEFAULT 0 COMMENT '辣度(0-3)',
  is_recommended TINYINT(1) DEFAULT 0 COMMENT '是否推荐',
  is_signature TINYINT(1) DEFAULT 0 COMMENT '是否招牌',
  is_available TINYINT(1) DEFAULT 1 COMMENT '是否上架',
  sort_order INT DEFAULT 0 COMMENT '排序',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category_id),
  INDEX idx_available (is_available),
  FOREIGN KEY (category_id) REFERENCES dish_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_no VARCHAR(64) UNIQUE NOT NULL COMMENT '订单号(UUID)',
  request_id VARCHAR(64) UNIQUE COMMENT '幂等请求ID',
  user_id INT COMMENT '用户ID',
  type ENUM('dine_in', 'takeout', 'delivery') DEFAULT 'dine_in' COMMENT '订单类型',
  status ENUM('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'expired') DEFAULT 'pending' COMMENT '订单状态',
  payment_status ENUM('unpaid', 'paid', 'refunded') DEFAULT 'unpaid' COMMENT '支付状态',
  total_amount DECIMAL(10,2) NOT NULL COMMENT '商品总价',
  discount_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '优惠金额',
  final_amount DECIMAL(10,2) NOT NULL COMMENT '实付金额',
  points_earned INT DEFAULT 0 COMMENT '获得积分',
  coupon_id INT COMMENT '使用的优惠券ID',
  table_no VARCHAR(20) COMMENT '桌号',
  guest_count INT DEFAULT 1 COMMENT '用餐人数',
  remarks TEXT COMMENT '备注(限200字)',
  address TEXT COMMENT '配送地址',
  contact_phone VARCHAR(100) COMMENT '联系电话(加密)',
  pay_expire_at DATETIME NOT NULL DEFAULT (DATE_ADD(NOW(), INTERVAL 15 MINUTE)) COMMENT '支付过期时间',
  paid_at DATETIME NULL COMMENT '支付时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_created (user_id, created_at),
  INDEX idx_status_created (status, created_at),
  INDEX idx_order_no (order_no),
  INDEX idx_request_id (request_id),
  INDEX idx_created (created_at),
  INDEX idx_pay_expire (pay_expire_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 订单明细表
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL COMMENT '订单ID',
  dish_id INT COMMENT '菜品ID',
  dish_name VARCHAR(100) NOT NULL COMMENT '菜品名称',
  quantity INT NOT NULL COMMENT '数量',
  unit_price DECIMAL(10,2) NOT NULL COMMENT '单价',
  subtotal DECIMAL(10,2) NOT NULL COMMENT '小计',
  remarks TEXT COMMENT '口味备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 购物车表
CREATE TABLE IF NOT EXISTS carts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '用户ID',
  dish_id INT NOT NULL COMMENT '菜品ID',
  quantity INT DEFAULT 1 COMMENT '数量',
  remarks TEXT COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_dish (user_id, dish_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
  INDEX idx_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 优惠券表
CREATE TABLE IF NOT EXISTS coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '优惠券名称',
  type ENUM('discount', 'cash') DEFAULT 'discount' COMMENT '类型',
  value DECIMAL(10,2) NOT NULL COMMENT '优惠值',
  min_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '使用门槛',
  max_discount DECIMAL(10,2) COMMENT '最高优惠',
  total_count INT DEFAULT 0 COMMENT '发放数量',
  remain_count INT DEFAULT 0 COMMENT '剩余数量',
  valid_from DATETIME COMMENT '生效时间',
  valid_until DATETIME COMMENT '过期时间',
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 用户优惠券表
CREATE TABLE IF NOT EXISTS user_coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  coupon_id INT NOT NULL,
  status ENUM('unused', 'used', 'expired') DEFAULT 'unused',
  obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
  INDEX idx_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 积分记录表
CREATE TABLE IF NOT EXISTS points_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('earn', 'redeem', 'expire') NOT NULL,
  points INT NOT NULL COMMENT '变动积分(正负)',
  balance INT NOT NULL COMMENT '变动后余额',
  source VARCHAR(50) COMMENT '来源(order/refund/activity)',
  order_no VARCHAR(64) COMMENT '关联订单',
  remark VARCHAR(255) COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 充值记录表
CREATE TABLE IF NOT EXISTS recharge_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL COMMENT '充值金额',
  bonus DECIMAL(10,2) DEFAULT 0.00 COMMENT '赠送金额',
  payment_method VARCHAR(20) COMMENT '支付方式',
  transaction_id VARCHAR(64) COMMENT '交易流水号',
  status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 排队叫号表
CREATE TABLE IF NOT EXISTS queues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  queue_no VARCHAR(20) UNIQUE NOT NULL COMMENT '排队号',
  store_id VARCHAR(50) NOT NULL COMMENT '门店ID',
  table_type ENUM('small', 'medium', 'large', '包间') DEFAULT 'small' COMMENT '桌型',
  people INT DEFAULT 1 COMMENT '人数',
  user_id INT COMMENT '用户ID',
  status ENUM('waiting', 'called', 'cancelled', 'served') DEFAULT 'waiting',
  called_at TIMESTAMP NULL COMMENT '叫号时间',
  served_at TIMESTAMP NULL COMMENT '入座时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_store_status (store_id, status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 系统设置表
CREATE TABLE IF NOT EXISTS system_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 库存变动记录表
CREATE TABLE IF NOT EXISTS stock_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dish_id INT NOT NULL,
  change INT NOT NULL COMMENT '变动数量(正负)',
  reason VARCHAR(100) COMMENT '变动原因',
  operator_id INT COMMENT '操作人',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
  INDEX idx_dish (dish_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 通知记录表
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT COMMENT '用户ID(为空则广播)',
  type VARCHAR(50) NOT NULL COMMENT '通知类型',
  title VARCHAR(100) COMMENT '标题',
  content TEXT COMMENT '内容',
  data JSON COMMENT '附加数据',
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 管理员操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id VARCHAR(64) NOT NULL COMMENT '管理员ID',
  admin_name VARCHAR(50) COMMENT '管理员名称',
  operation VARCHAR(100) NOT NULL COMMENT '操作类型',
  detail TEXT COMMENT '操作详情',
  ip VARCHAR(45) NOT NULL COMMENT 'IP地址',
  user_agent TEXT COMMENT '浏览器信息',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin (admin_id),
  INDEX idx_operation (operation),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 管理员角色表
CREATE TABLE IF NOT EXISTS admin_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL COMMENT '用户ID',
  role ENUM('super_admin', 'manager', 'cashier') NOT NULL DEFAULT 'cashier' COMMENT '角色',
  permissions JSON COMMENT '额外权限(超出角色默认权限)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入默认超级管理员角色
INSERT INTO admin_roles (user_id, role) VALUES ('admin001', 'super_admin');

-- 历史订单归档表(用于数据归档)
CREATE TABLE IF NOT EXISTS orders_archive (
  id INT AUTO_INCREMENT PRIMARY KEY,
  original_id INT NOT NULL COMMENT '原订单ID',
  order_no VARCHAR(64) NOT NULL COMMENT '订单号',
  request_id VARCHAR(64) COMMENT '幂等请求ID',
  user_id INT COMMENT '用户ID',
  type ENUM('dine_in', 'takeout', 'delivery') DEFAULT 'dine_in' COMMENT '订单类型',
  status ENUM('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'expired') COMMENT '订单状态',
  payment_status ENUM('unpaid', 'paid', 'refunded') COMMENT '支付状态',
  total_amount DECIMAL(10,2) NOT NULL COMMENT '商品总价',
  discount_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '优惠金额',
  final_amount DECIMAL(10,2) NOT NULL COMMENT '实付金额',
  points_earned INT DEFAULT 0 COMMENT '获得积分',
  table_no VARCHAR(20) COMMENT '桌号',
  guest_count INT DEFAULT 1 COMMENT '用餐人数',
  remarks TEXT COMMENT '备注',
  address TEXT COMMENT '配送地址',
  contact_phone VARCHAR(100) COMMENT '联系电话',
  pay_expire_at DATETIME COMMENT '支付过期时间',
  paid_at DATETIME NULL COMMENT '支付时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '归档时间',
  INDEX idx_order_no (order_no),
  INDEX idx_user (user_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 退款记录表
CREATE TABLE IF NOT EXISTS refunds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL COMMENT '订单ID',
  refund_no VARCHAR(64) UNIQUE NOT NULL COMMENT '退款单号',
  amount DECIMAL(10,2) NOT NULL COMMENT '退款金额',
  reason VARCHAR(255) COMMENT '退款原因',
  status ENUM('pending', 'success', 'fail') DEFAULT 'pending' COMMENT '退款状态',
  fail_reason VARCHAR(255) COMMENT '失败原因',
  refund_time DATETIME NULL COMMENT '退款时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order_id (order_id),
  INDEX idx_refund_no (refund_no),
  INDEX idx_status (status),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 如果是已存在的数据库，执行以下ALTER语句添加新字段和索引
-- ALTER TABLE orders ADD COLUMN pay_expire_at DATETIME NOT NULL DEFAULT (DATE_ADD(NOW(), INTERVAL 15 MINUTE)) COMMENT '支付过期时间' AFTER remarks;
-- ALTER TABLE orders ADD COLUMN paid_at DATETIME NULL COMMENT '支付时间' AFTER pay_expire_at;
-- ALTER TABLE orders MODIFY COLUMN status ENUM('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'expired') DEFAULT 'pending';
-- ALTER TABLE orders ADD INDEX idx_user_created (user_id, created_at);
-- ALTER TABLE orders ADD INDEX idx_status_created (status, created_at);
-- ALTER TABLE orders ADD INDEX idx_pay_expire (pay_expire_at);
-- ALTER TABLE carts ADD INDEX idx_updated (updated_at);
-- ALTER TABLE users MODIFY COLUMN phone VARCHAR(100) COMMENT '手机号(加密存储)';
