# 快速开始指南

本指南将帮助您在几分钟内启动并运行雨姗AI收银助手智能餐饮系统。

## 目录

1. [系统要求](#系统要求)
2. [快速启动选项](#快速启动选项)
3. [使用说明](#使用说明)
4. [常见问题](#常见问题)

---

## 系统要求

### 最低配置
- **CPU**: 1核心
- **内存**: 2GB RAM
- **存储**: 5GB 可用空间

### 推荐配置
- **CPU**: 2核心
- **内存**: 4GB RAM
- **存储**: 10GB 可用空间

### 软件要求
- **Node.js**: 18.x 或更高版本
- **npm**: 9.x 或更高版本（随 Node.js 安装）
- **Docker**: 20.10 或更高版本（可选，Docker 部署方式需要）

---

## 快速启动选项

### 选项 1：演示模式（最快，零配置）⭐

演示模式会使用内存数据库，无需安装 MySQL 和 Redis。

#### Windows 用户
```bash
# 1. 下载代码并解压
# 2. 双击运行
start-demo.bat
```

#### Linux / macOS 用户
```bash
# 1. 下载并解压代码
git clone https://github.com/370205504-cmyk/yushan-ai-cashier-assistant.git
cd yushan-ai-cashier-assistant

# 2. 安装依赖（仅首次运行）
cd lambda
npm install

# 3. 启动演示模式
cd ..
./start.sh demo
```

访问：http://localhost:3000

---

### 选项 2：Docker 部署（推荐生产环境）⭐⭐⭐

这是最简单、最稳定的部署方式。

```bash
# 1. 下载代码
git clone https://github.com/370205504-cmyk/yushan-ai-cashier-assistant.git
cd yushan-ai-cashier-assistant

# 2. 启动所有服务
docker-compose up -d

# 3. 等待初始化完成（约30秒）
docker-compose logs -f
```

访问：http://localhost:3000

**停止服务**：
```bash
docker-compose down
```

**查看日志**：
```bash
docker-compose logs -f
```

---

### 选项 3：本地完整部署（适合开发）

需要安装 MySQL 和 Redis。

#### 1. 安装依赖
```bash
cd lambda
npm install
```

#### 2. 配置环境变量
复制 `.env.example` 为 `.env` 并修改配置：
```bash
cd ..
cp .env.example .env
# 编辑 .env 文件，配置数据库和其他选项
```

#### 3. 初始化数据库
```bash
cd lambda
node database/migrate.js
```

#### 4. 导入演示数据（可选）
```bash
# Windows
import-demo-data.bat

# Linux/Mac
cd lambda/scripts
node import-demo-data.js
```

#### 5. 启动服务
```bash
# Windows
start.bat

# Linux/Mac
./start.sh
```

---

## 使用说明

### 管理后台
- **URL**: http://localhost:3000/admin
- **默认账号**: admin@yushan.com
- **默认密码**: admin123

**⚠️ 重要：请在首次登录后立即修改默认密码！**

### 顾客端
- **URL**: http://localhost:3000
- **功能**: 浏览菜单、点餐、查看订单等

### 移动端点餐
- **URL**: http://localhost:3000/mobile
- **功能**: 手机端优化的点餐界面

### 大模型配置
- **URL**: http://localhost:3000/llm-config
- **功能**: 配置DeepSeek、OpenAI等大模型API

### API 文档
启动服务后访问：http://localhost:3000/api/docs

---

## 商业服务查询功能

系统支持 20+ 种自然语言查询：

| 类别 | 查询内容 | 示例问题 |
|------|----------|----------|
| **门店信息** | 地址、电话、营业时间 | "你们店在哪里？" |
| **WiFi** | WiFi 密码 | "WiFi 密码是多少？" |
| **停车** | 停车信息 | "有停车位吗？" |
| **服务** | 充电宝、宠物政策、发票 | "有充电宝吗？" |
| **活动** | 最新优惠 | "最近有什么活动？" |
| **预订** | 包间预订 | "可以预订包间吗？" |
| **外卖** | 外卖信息 | "可以送外卖吗？" |

---

## 常见问题

### Q: 端口 3000 被占用了怎么办？
**A:** 修改 `.env` 文件中的 `PORT` 变量或 `docker-compose.yml` 中的端口映射。

### Q: 演示模式的数据会保存吗？
**A:** 演示模式使用内存数据库，重启后数据会丢失。生产环境请使用 Docker 部署或本地完整部署。

### Q: 如何连接微信支付/支付宝？
**A:** 在管理后台的支付配置中填写微信支付/支付宝的商户信息。

### Q: 支持多门店吗？
**A:** 是的！系统支持多门店，可在管理后台配置门店信息。

### Q: 如何备份数据？
**A:** 使用 `lambda/database/backup.js` 脚本进行数据备份。

---

## 获取帮助

- **GitHub Issues**: https://github.com/370205504-cmyk/yushan-ai-cashier-assistant/issues
- **完整文档**: https://github.com/370205504-cmyk/yushan-ai-cashier-assistant/blob/main/docs/DEPLOYMENT.md

---

## 下一步

1. 访问管理后台，修改默认密码
2. 配置门店信息和支付设置
3. 导入或添加菜品数据
4. 开始营业！

🎉 祝您使用愉快！
