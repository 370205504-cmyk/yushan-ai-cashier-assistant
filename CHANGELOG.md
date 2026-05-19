# 更新日志

所有重要的更新都会在此记录。

## [5.0.0] - 2026-05-18

### 🎉 重大更新：v5.0.0 正式上线

#### 核心功能
- ✨ **AI智能助手优化** - 优化系统提示词，明确餐厅信息，提升回答准确性
- ✨ **LLM参数调优** - 调整模型温度、超时时间，提升响应速度和稳定性
- ✨ **大模型配置页面** - 新增 `/llm-config`，支持配置DeepSeek、OpenAI等大模型
- ✨ **首页公示更新** - 更新为v5.0.0版本，展示完整功能

#### 技术优化
- ✨ **系统提示词优化** - 包含餐厅地址、营业时间、WiFi密码、招牌菜信息
- ✨ **LLM服务参数** - 超时15秒、max tokens 500、temperature 0.7
- ✨ **安全性增强** - XSS/CSRF防护、速率限制、AES-256加密存储
- ✨ **系统监控** - 数据库、磁盘、系统资源全方位监控

#### 功能完善
- ✨ **移动端点餐** - 菜品浏览、搜索、购物车、订单完整流程
- ✨ **管理后台** - 菜品管理、订单管理、数据监控
- ✨ **API接口** - 完整RESTful API支持

---

## [3.0.0] - 2026-05-11

### 🎉 重大更新：商业化改造 + AI Agent适配

#### 核心功能
- ✨ **HTTP服务器独立运行** - 新增 `server.js`，可本地运行无需AWS
- ✨ **RESTful API完整重构** - 新增 `routes/api.js`，完整商业化接口
- ✨ **AI Agent适配层** - 新增 `routes/agent.js`，支持扣子/龙虾/Dify等平台
- ✨ **购物车系统** - 新增 `services/cartService.js`，支持加菜、减菜、备注
- ✨ **订单管理V2** - 新增 `services/orderServiceV2.js`，完整订单生命周期
- ✨ **智能推荐** - 新增 `services/dishesService.js`，多维度智能推荐

#### 商业化功能
- ✨ **支付网关预留** - 新增 `integrations/paymentGateway.js`
- ✨ **收银SaaS对接** - 新增 `integrations/cashierAdapter.js`（银豹/美团/客如云）
- ✨ **后台管理系统** - 新增 `web/admin.html`，可视化订单管理
- ✨ **日志系统** - 新增 `utils/logger.js`，完整操作日志
- ✨ **多轮对话上下文** - 新增 `session/contextManager.js`

#### 部署优化
- ✨ **一键启动脚本** - `start.sh`，本地运行无需AWS
- ✨ **Docker容器化** - `Dockerfile` + `docker-compose.yml`
- ✨ **统一配置中心** - `config.json` 集中管理所有配置

#### 数据更新
- ✨ **菜品数据扩展** - 从原有菜品扩展到120道完整菜单
- ✨ **6大菜品分类** - 招牌菜、特色硬菜、宴请首选、餐前开胃、家常炒菜、汤羹主食

### API接口

#### 基础接口
- `GET /api/v1/menu` - 获取菜单列表
- `GET /api/v1/dishes` - 查询菜品
- `GET /api/v1/recommend` - 智能推荐
- `GET /api/v1/stores` - 门店信息
- `GET /api/v1/wifi` - WiFi密码

#### 购物车接口
- `GET /api/v1/cart/:userId` - 获取购物车
- `POST /api/v1/cart/add` - 添加商品
- `POST /api/v1/cart/remove` - 移除商品
- `POST /api/v1/cart/clear` - 清空购物车

#### 订单接口
- `POST /api/v1/order` - 创建订单
- `GET /api/v1/order/:orderId` - 查询订单
- `PUT /api/v1/order/:orderId/status` - 更新状态
- `GET /api/v1/orders` - 订单列表
- `POST /api/v1/order/:orderId/print` - 打印小票

#### 管理接口
- `GET /api/v1/stats` - 经营统计
- `GET /admin/orders` - 后台订单管理
- `PUT /admin/order/:orderId/status` - 更新订单状态
- `POST /admin/order/:orderId/print` - 重打小票

### 技术栈
- Node.js 18+
- Express.js
- Docker
- AWS Lambda (兼容)

### 文件结构
```
lambda/
├── server.js              # HTTP服务器入口
├── routes/
│   ├── api.js            # RESTful API
│   ├── agent.js          # AI Agent适配
│   └── admin.js          # 后台管理
├── services/
│   ├── cartService.js    # 购物车
│   ├── orderServiceV2.js # 订单V2
│   └── dishesService.js  # 菜品服务
├── integrations/
│   ├── paymentGateway.js # 支付网关
│   └── cashierAdapter.js # 收银对接
├── session/
│   └── contextManager.js # 对话上下文
└── utils/
    └── logger.js        # 日志系统
```

---

## [2.1.0] - 2026-05-11

### 功能更新
- 🔧 开发者改为石中伟
- 📍 新增地址和营业时间查询
- 📶 新增WiFi密码连接功能
- 🍜 新增菜单显示功能
- ⭐ 新增智能推荐功能
- 🖨️ 新增打印机连接功能
- 🛒 新增顾客自主下单功能

---

## [2.0.0] - 2026-05-11

### 重大更新
- 🚀 品牌升级为"雨姗AI收银助手创味菜"
- 📱 支持O2O功能
- 🔗 支持社交分享
- 💬 增强多轮对话能力

---

## [1.0.0] - 2026-05-11

### 初始版本
- 🍽️ 基础菜品查询
- ⭐ 招牌菜推荐
- 📍 门店查询
- 🎤 Alexa语音交互
