-- 订单表优化索引
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_type_status ON orders(type, status);

-- 菜品表优化索引
CREATE INDEX IF NOT EXISTS idx_dishes_category ON dishes(category, status);
CREATE INDEX IF NOT EXISTS idx_dishes_status_category ON dishes(status, category);

-- 购物车表优化索引
CREATE INDEX IF NOT EXISTS idx_cart_user_dish ON cart_items(user_id, dish_id);

-- 订单明细表优化索引
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_dish ON order_items(dish_id);

-- 会员表优化索引
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_members_user ON members(user_id);

-- 地址表优化索引
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);

-- 操作日志表优化索引
CREATE INDEX IF NOT EXISTS idx_operation_logs_user_time ON operation_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operation_logs_type_time ON operation_logs(operation_type, created_at DESC);

-- 退款表
CREATE TABLE IF NOT EXISTS refunds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  refund_no VARCHAR(64) NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  reason VARCHAR(500),
  status ENUM('pending', 'success', 'fail') DEFAULT 'pending',
  refund_time DATETIME,
  fail_reason VARCHAR(500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_refunds_order (order_id),
  INDEX idx_refunds_no (refund_no),
  INDEX idx_refunds_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 操作日志表新增类型
-- ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS operation_type VARCHAR(50);
-- ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS operation_details JSON;

-- 用户数据删除记录表（GDPR合规）
CREATE TABLE IF NOT EXISTS user_data_deletions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  request_user_id INT NOT NULL,
  deletion_type ENUM('full', 'anonymize') NOT NULL,
  request_ip VARCHAR(45),
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  completed_at DATETIME,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_deletion_user (user_id),
  INDEX idx_deletion_status (status),
  INDEX idx_deletion_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 数据库连接池监控表
CREATE TABLE IF NOT EXISTS db_pool_stats (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  all_connections INT NOT NULL,
  free_connections INT NOT NULL,
  queue_length INT NOT NULL,
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_recorded_at (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;