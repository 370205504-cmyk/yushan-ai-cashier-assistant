# 雨姗AI收银助手 v5.0.0

---

## 🎉 项目已上线！

**雨姗AI收银助手 - 自然语义智能体** 是一个功能完整、可直接投入使用的智能收银系统！

---

## ✨ 核心功能

| 功能模块 | 状态 | 说明 |
|---------|------|------|
| 📱 **移动端点餐** | ✅ 完成 | 支持菜品浏览、搜索、购物车、订单 |
| 🤖 **AI智能助手** | ✅ 完成 | 自然语言点餐、智能推荐、问答 |
| ⚙️ **管理后台** | ✅ 完成 | 菜品管理、订单管理、数据监控 |
| 🔌 **API接口** | ✅ 完成 | 完整的RESTful API |
| 🔒 **安全防护** | ✅ 完成 | XSS/CSRF防护、速率限制、AES-256加密 |
| 📊 **系统监控** | ✅ 完成 | 数据库、磁盘、系统资源监控 |
| 🤝 **大模型集成** | ✅ 完成 | 支持DeepSeek、OpenAI、Moonshot等 |

---

## 📦 项目结构

```
yushan-ai-cashier-assistant/
├── lambda/                   ← 【核心后端】Express服务
│   ├── server.js            ← 服务入口
│   ├── routes/              ← API路由
│   ├── services/            ← 业务服务
│   ├── middleware/          ← 安全中间件
│   ├── web/                 ← 前端页面（H5、管理后台）
│   └── database/            ← SQLite数据库（开箱即用）
├── docs/                    ← 技术文档
└── README.md
```

---

## 🔧 技术亮点

### v5.0 新特性

- ✅ **配置向导** - 一键配置收银对接
- ✅ **数据安全** - AES-256加密存储
- ✅ **绿色部署** - Windows绿色版开箱即用
- ✅ **安全增强** - 速率限制、XSS/CSRF防护
- ✅ **AI智能优化** - 智能回复更准确、响应更快

### v4.3 已实现

- ✅ **可插拔适配器架构** - 支持主流收银系统对接
- ✅ **MCP工具扩展** - AI Agent可调用收银接口
- ✅ **自然语义理解** - 大白话点餐，意图识别
- ✅ **上下文记忆增强** - 记住口味、历史订单
- ✅ **AI主动技能** - 迎宾、推荐、提醒
- ✅ **企业微信机器人** - 扣子平台，语音点餐
- ✅ **自动转人工** - 复杂问题自动转人工客服
- ✅ **AI经营简报** - 每日自动生成分析报告

---

## 🚀 快速开始

### 方式一：H5移动端点餐（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/370205504-cmyk/yushan-ai-cashier-assistant.git
cd yushan-ai-cashier-assistant

# 2. 安装依赖
cd lambda
npm install

# 3. 启动服务
node server.js

# 4. 访问页面
# 顾客移动端点餐：http://localhost:3000/mobile
# 商家管理后台：http://localhost:3000/admin
# 大模型配置：http://localhost:3000/llm-config
```

### 方式二：Windows一键启动

双击 `一键启动.bat` 即可！

---

## 📋 环境要求

- **Node.js**: >=18.0.0 <22.0.0
- **数据库**: SQLite（开箱即用，无需额外配置）

---

## 💰 成本估算

| 项目 | 费用 | 说明 |
|------|------|------|
| 大模型API | 按需 | DeepSeek等，按使用量计费 |
| 打印小票机 | ~259元 | 可选，趋势科技购买 |
| **总计** | **0元起** | 本地部署无需服务器 |

---

## 📞 技术支持

- **GitHub Issues**: https://github.com/370205504-cmyk/yushan-ai-cashier-assistant/issues
- **功能建议**: 提交 Issue 或 Pull Request

---

## 📄 许可证

Apache License 2.0
