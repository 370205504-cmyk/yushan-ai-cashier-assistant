# 部署指南

## 目录

- [快速开始](#快速开始)
- [系统要求](#系统要求)
- [跨平台本地部署](#跨平台本地部署)
  - [Windows](#windows)
  - [Linux / macOS](#linux--macos)
- [Docker部署](#docker部署)
- [云平台部署](#云平台部署)
  - [腾讯云](#腾讯云)
  - [阿里云](#阿里云)
  - [AWS](#aws)
- [生产环境配置](#生产环境配置)
- [常见问题](#常见问题)

---

## 快速开始

### 最快的方式 - Docker部署

```bash
# 1. 克隆项目
git clone https://github.com/370205504-cmyk/yushan-ai-cashier-assistant.git
cd yushan-ai-cashier-assistant

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，修改密码等敏感信息

# 3. 启动
docker-compose up -d

# 4. 访问
# 顾客端: http://localhost:3000
# 管理后台: http://localhost:3000/admin
```

### 演示模式（无需数据库）

```bash
# Windows
start-demo.bat

# Linux / macOS
./start.sh demo
```

---

## 系统要求

| 组件 | 最低要求 | 推荐配置 |
|------|----------|----------|
| Node.js | v16+ | v18+ |
| CPU | 1核 | 2核+ |
| 内存 | 2GB | 4GB+ |
| 磁盘 | 10GB | 20GB+ |
| 数据库 | MySQL 8.0 / SQLite | MySQL 8.0 + Redis |

---

## 跨平台本地部署

### Windows

#### 1. 安装Node.js

下载并安装: https://nodejs.org/

选择 **LTS** 版本

#### 2. 下载项目

```bash
# 方式1: 下载ZIP
# https://github.com/370205504-cmyk/yushan-ai-cashier-assistant/archive/refs/heads/main.zip

# 方式2: 使用Git
git clone https://github.com/370205504-cmyk/yushan-ai-cashier-assistant.git
```

#### 3. 运行

```bash
# 进入项目目录
cd yushan-ai-cashier-assistant

# 演示模式（无需数据库）
# 双击 start-demo.bat

# 完整模式（需要MySQL + Redis）
# 先配置 .env 文件
# 然后双击 start.bat
```

#### 4. 访问

- 顾客端: http://localhost:3000
- 管理后台: http://localhost:3000/admin

### Linux / macOS

#### 1. 安装Node.js

```bash
# macOS (使用Homebrew)
brew install node

# Linux (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Linux (CentOS/RHEL)
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

#### 2. 下载项目

```bash
git clone https://github.com/370205504-cmyk/yushan-ai-cashier-assistant.git
cd yushan-ai-cashier-assistant
```

#### 3. 运行

```bash
# 演示模式（无需数据库）
chmod +x start.sh
./start.sh demo

# 完整模式（需要MySQL + Redis）
cp .env.example .env
# 编辑 .env 配置数据库
./start.sh
```

#### 可用命令

```bash
./start.sh              # 生产模式
./start.sh dev          # 开发模式 (nodemon)
./start.sh demo         # 演示模式
./start.sh help         # 帮助

./stop.sh               # 停止服务
```

---

## Docker部署

### 前置条件

安装Docker和Docker Compose:

```bash
# 安装Docker
curl -fsSL https://get.docker.com | sh

# 安装Docker Compose (Linux)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 快速启动

```bash
# 1. 克隆项目
git clone https://github.com/370205504-cmyk/yushan-ai-cashier-assistant.git
cd yushan-ai-cashier-assistant

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，修改以下配置:
# - DB_PASSWORD (数据库密码)
# - JWT_SECRET (JWT密钥，生产环境必须修改)
# - ADMIN_API_KEY (管理员API密钥)

# 3. 启动所有服务
docker-compose up -d

# 4. 查看日志
docker-compose logs -f

# 5. 访问
# 顾客端: http://localhost:3000
# 管理后台: http://localhost:3000/admin
```

### 常用命令

```bash
# 启动
docker-compose up -d

# 停止
docker-compose down

# 停止并删除数据卷（慎用）
docker-compose down -v

# 查看日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f app

# 重启服务
docker-compose restart

# 更新代码后重新构建
docker-compose up -d --build
```

### 包含的服务

| 服务 | 说明 | 端口 |
|------|------|------|
| app | 主应用 | 3000 |
| mysql | 数据库 | 3306 |
| redis | 缓存 | 6379 |
| nginx | 反向代理（可选） | 80, 443 |

---

## 云平台部署

### 腾讯云

#### 使用部署脚本

```bash
./deploy-tencent.sh
```

#### 推荐方案 - 轻量应用服务器

1. 购买轻量应用服务器
   - 配置: 2核4GB
   - 系统: Ubuntu 22.04

2. 连接服务器
```bash
ssh root@your-server-ip
```

3. 安装Docker
```bash
curl -fsSL https://get.docker.com | sh
```

4. 部署项目
```bash
git clone https://github.com/370205504-cmyk/yushan-ai-cashier-assistant.git
cd yushan-ai-cashier-assistant
cp .env.example .env
# 编辑 .env 配置
docker-compose up -d
```

5. 配置域名和SSL（可选）
   - 购买域名
   - 配置DNS解析
   - 使用Let's Encrypt申请SSL证书
   - 配置nginx

### 阿里云

#### 使用部署脚本

```bash
./deploy-aliyun.sh
```

#### 推荐方案 - ECS

1. 创建ECS实例
   - 实例规格: ecs.t6-c1m2.large (2核4GB)
   - 镜像: Ubuntu 22.04
   - 安全组: 开放 22, 80, 443, 3000 端口

2. 后续步骤同腾讯云

### AWS

#### 使用部署脚本

```bash
./deploy-aws.sh
```

#### 推荐方案 - EC2

1. 启动EC2实例
   - 实例类型: t2.medium
   - AMI: Ubuntu Server 22.04 LTS
   - 安全组: 开放 22, 80, 443, 3000 端口

2. 后续步骤同腾讯云

---

## 生产环境配置

### 环境变量配置

复制 `.env.example` 为 `.env` 并配置:

```bash
# 基础配置
PORT=3000
NODE_ENV=production

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=yushan_app
DB_PASSWORD=your_secure_password
DB_NAME=yushan_restaurant

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT密钥（生产环境必须修改！）
JWT_SECRET=your_very_secure_jwt_secret_key_here_change_this
JWT_EXPIRES_IN=7d

# 微信支付
WECHAT_APPID=your_wechat_appid
WECHAT_MCHID=your_wechat_mchid
WECHAT_APIKEY=your_wechat_apikey

# 支付宝
ALIPAY_APPID=your_alipay_appid
ALIPAY_PRIVATE_KEY=your_alipay_private_key
```

### 数据库配置

1. 创建专用数据库用户（不要使用root）
```sql
CREATE USER 'yushan_app'@'localhost' IDENTIFIED BY 'your_password';
CREATE DATABASE yushan_restaurant CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON yushan_restaurant.* TO 'yushan_app'@'localhost';
FLUSH PRIVILEGES;
```

2. 运行初始化脚本
```bash
cd lambda
node database/init.js
```

### 备份策略

```bash
# 配置自动备份
# 编辑 cron
crontab -e

# 添加每日备份
0 2 * * * /path/to/project/scripts/backup.sh
```

### 性能优化

1. 启用Redis缓存
2. 配置Nginx反向代理
3. 启用Gzip压缩
4. 配置CDN（图片等静态资源）
5. 数据库索引优化

---

## 常见问题

### 端口被占用

修改 `.env` 中的 `PORT` 变量，或停止占用端口的程序:

```bash
# Linux/macOS
lsof -i :3000
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### 数据库连接失败

1. 检查MySQL是否启动
2. 检查 `.env` 配置是否正确
3. 检查防火墙设置
4. 查看日志: `docker-compose logs mysql`

### 依赖安装失败

```bash
# 清除缓存重新安装
cd lambda
rm -rf node_modules package-lock.json
npm install
```

### 演示模式数据丢失

演示模式使用内存数据库，重启后数据会清空。如需持久化数据，请使用完整模式。

---

## 获取帮助

- GitHub Issues: https://github.com/370205504-cmyk/yushan-ai-cashier-assistant/issues
- 文档: docs/
- 快速开始: quick-start.sh

---

## 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md)
