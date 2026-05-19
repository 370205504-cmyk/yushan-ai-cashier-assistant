# 雨姗AI收银助手 - 扣子平台技能配置指南

## 概述

雨姗AI收银助手提供完整的扣子（Coze）平台对接能力，支持企业微信机器人、智能客服、语音点餐等多种场景。通过本技能配置，您可以让扣子机器人具备完整的餐饮点餐能力。

## 技能信息

| 项目 | 内容 |
|------|------|
| 技能名称 | 雨姗AI收银助手 |
| 版本 | v4.3.0 |
| 作者 | 雨姗科技 |
| 描述 | 餐饮智能点餐助手，支持自然语义点餐、订单管理、会员服务 |
| 标签 | 餐饮、点餐、会员、AI助手 |

## MCP 工具配置

### 基础信息

```json
{
  "server_url": "https://your-domain.com/api/v1/mcp/message",
  "auth_type": "bearer_token",
  "token": "YOUR_API_TOKEN"
}
```

### 工具列表（26个标准工具）

#### 1. 点餐相关工具

##### 1.1 获取菜品列表
```json
{
  "name": "getDishes",
  "description": "获取收银系统的菜品列表，支持按分类筛选",
  "parameters": {
    "type": "object",
    "properties": {
      "category": {
        "type": "string",
        "description": "分类名称（可选），如：招牌菜、热销、主食等"
      }
    }
  },
  "examples": [
    "获取招牌菜列表",
    "看看有什么主食"
  ]
}
```

##### 1.2 添加菜品到购物车
```json
{
  "name": "addToCart",
  "description": "将菜品添加到购物车",
  "parameters": {
    "type": "object",
    "properties": {
      "dishId": {
        "type": "string",
        "description": "菜品ID"
      },
      "dishName": {
        "type": "string",
        "description": "菜品名称"
      },
      "quantity": {
        "type": "integer",
        "description": "数量，默认1"
      },
      "notes": {
        "type": "string",
        "description": "口味备注，如：不要香菜、微辣"
      }
    },
    "required": ["dishId", "dishName"]
  }
}
```

##### 1.3 查看购物车
```json
{
  "name": "viewCart",
  "description": "查看当前购物车内容和总金额",
  "parameters": {
    "type": "object",
    "properties": {}
  }
}
```

##### 1.4 确认下单
```json
{
  "name": "confirmOrder",
  "description": "确认订单并提交到收银系统",
  "parameters": {
    "type": "object",
    "properties": {
      "customerId": {
        "type": "string",
        "description": "顾客ID或手机号"
      },
      "tableNumber": {
        "type": "string",
        "description": "桌号（堂食时填写）"
      },
      "deliveryType": {
        "type": "string",
        "enum": ["dine_in", "takeout", "delivery"],
        "description": "用餐方式：dine_in=堂食, takeout=自提, delivery=外卖"
      },
      "address": {
        "type": "string",
        "description": "配送地址（外卖时填写）"
      }
    },
    "required": ["customerId"]
  }
}
```

##### 1.5 取消订单
```json
{
  "name": "cancelOrder",
  "description": "取消未支付的订单",
  "parameters": {
    "type": "object",
    "properties": {
      "orderId": {
        "type": "string",
        "description": "订单ID"
      }
    },
    "required": ["orderId"]
  }
}
```

##### 1.6 查询订单状态
```json
{
  "name": "getOrderStatus",
  "description": "查询订单制作状态",
  "parameters": {
    "type": "object",
    "properties": {
      "orderId": {
        "type": "string",
        "description": "订单ID"
      }
    },
    "required": ["orderId"]
  }
}
```

#### 2. 库存相关工具

##### 2.1 查询库存
```json
{
  "name": "getInventory",
  "description": "查询菜品库存",
  "parameters": {
    "type": "object",
    "properties": {
      "dishId": {
        "type": "string",
        "description": "菜品ID（可选，不填查询全部）"
      }
    }
  }
}
```

#### 3. 会员相关工具

##### 3.1 查询会员信息
```json
{
  "name": "getMemberInfo",
  "description": "查询会员信息和余额",
  "parameters": {
    "type": "object",
    "properties": {
      "phone": {
        "type": "string",
        "description": "会员手机号"
      }
    },
    "required": ["phone"]
  }
}
```

##### 3.2 注册新会员
```json
{
  "name": "registerMember",
  "description": "注册新会员",
  "parameters": {
    "type": "object",
    "properties": {
      "phone": {
        "type": "string",
        "description": "手机号"
      },
      "name": {
        "type": "string",
        "description": "姓名（可选）"
      }
    },
    "required": ["phone"]
  }
}
```

##### 3.3 会员积分查询
```json
{
  "name": "getMemberPoints",
  "description": "查询会员积分",
  "parameters": {
    "type": "object",
    "properties": {
      "phone": {
        "type": "string",
        "description": "会员手机号"
      }
    },
    "required": ["phone"]
  }
}
```

##### 3.4 积分抵现
```json
{
  "name": "redeemPoints",
  "description": "使用积分抵扣现金",
  "parameters": {
    "type": "object",
    "properties": {
      "phone": {
        "type": "string",
        "description": "会员手机号"
      },
      "points": {
        "type": "integer",
        "description": "使用的积分数量"
      }
    },
    "required": ["phone", "points"]
  }
}
```

#### 4. 优惠券相关工具

##### 4.1 查询可用优惠券
```json
{
  "name": "getAvailableCoupons",
  "description": "查询用户可用的优惠券",
  "parameters": {
    "type": "object",
    "properties": {
      "userId": {
        "type": "string",
        "description": "用户ID或手机号"
      },
      "orderAmount": {
        "type": "number",
        "description": "订单金额"
      }
    },
    "required": ["userId", "orderAmount"]
  }
}
```

##### 4.2 使用优惠券
```json
{
  "name": "useCoupon",
  "description": "使用优惠券",
  "parameters": {
    "type": "object",
    "properties": {
      "userId": {
        "type": "string",
        "description": "用户ID或手机号"
      },
      "couponId": {
        "type": "string",
        "description": "优惠券ID"
      }
    },
    "required": ["userId", "couponId"]
  }
}
```

#### 5. 支付相关工具

##### 5.1 创建支付订单
```json
{
  "name": "createPayment",
  "description": "创建微信/支付宝支付订单",
  "parameters": {
    "type": "object",
    "properties": {
      "orderId": {
        "type": "string",
        "description": "订单ID"
      },
      "paymentMethod": {
        "type": "string",
        "enum": ["wechat", "alipay", "balance"],
        "description": "支付方式：wechat=微信, alipay=支付宝, balance=余额"
      }
    },
    "required": ["orderId", "paymentMethod"]
  }
}
```

##### 5.2 查询支付状态
```json
{
  "name": "getPaymentStatus",
  "description": "查询支付状态",
  "parameters": {
    "type": "object",
    "properties": {
      "orderId": {
        "type": "string",
        "description": "订单ID"
      }
    },
    "required": ["orderId"]
  }
}
```

#### 6. 商家信息查询工具

##### 6.1 查询门店信息
```json
{
  "name": "getStoreInfo",
  "description": "查询门店基本信息",
  "parameters": {
    "type": "object",
    "properties": {}
  }
}
```

##### 6.2 查询营业时间
```json
{
  "name": "getBusinessHours",
  "description": "查询门店营业时间",
  "parameters": {
    "type": "object",
    "properties": {}
  }
}
```

##### 6.3 WiFi信息查询
```json
{
  "name": "getWifiInfo",
  "description": "查询门店WiFi信息",
  "parameters": {
    "type": "object",
    "properties": {}
  }
}
```

##### 6.4 停车信息查询
```json
{
  "name": "getParkingInfo",
  "description": "查询停车信息",
  "parameters": {
    "type": "object",
    "properties": {}
  }
}
```

#### 7. 预约相关工具

##### 7.1 预约座位
```json
{
  "name": "bookTable",
  "description": "预约座位",
  "parameters": {
    "type": "object",
    "properties": {
      "customerId": {
        "type": "string",
        "description": "顾客ID"
      },
      "date": {
        "type": "string",
        "description": "预约日期，格式：YYYY-MM-DD"
      },
      "time": {
        "type": "string",
        "description": "预约时间，格式：HH:mm"
      },
      "guestCount": {
        "type": "integer",
        "description": "用餐人数"
      },
      "phone": {
        "type": "string",
        "description": "联系电话"
      },
      "notes": {
        "type": "string",
        "description": "备注（是否需要包间等）"
      }
    },
    "required": ["customerId", "date", "time", "guestCount", "phone"]
  }
}
```

##### 7.2 查询预约
```json
{
  "name": "getBooking",
  "description": "查询预约信息",
  "parameters": {
    "type": "object",
    "properties": {
      "customerId": {
        "type": "string",
        "description": "顾客ID"
      }
    },
    "required": ["customerId"]
  }
}
```

##### 7.3 取消预约
```json
{
  "name": "cancelBooking",
  "description": "取消预约",
  "parameters": {
    "type": "object",
    "properties": {
      "bookingId": {
        "type": "string",
        "description": "预约ID"
      }
    },
    "required": ["bookingId"]
  }
}
```

#### 8. 排队相关工具

##### 8.1 取号排队
```json
{
  "name": "getQueueNumber",
  "description": "取号排队",
  "parameters": {
    "type": "object",
    "properties": {
      "guestCount": {
        "type": "integer",
        "description": "排队人数"
      },
      "phone": {
        "type": "string",
        "description": "联系电话"
      }
    },
    "required": ["guestCount", "phone"]
  }
}
```

##### 8.2 查询排队进度
```json
{
  "name": "getQueueStatus",
  "description": "查询排队进度",
  "parameters": {
    "type": "object",
    "properties": {
      "queueId": {
        "type": "string",
        "description": "排队号"
      }
    },
    "required": ["queueId"]
  }
}
```

##### 8.3 取消排队
```json
{
  "name": "cancelQueue",
  "description": "取消排队",
  "parameters": {
    "type": "object",
    "properties": {
      "queueId": {
        "type": "string",
        "description": "排队号"
      }
    },
    "required": ["queueId"]
  }
}
```

#### 9. 反馈相关工具

##### 9.1 提交投诉建议
```json
{
  "name": "submitFeedback",
  "description": "提交投诉或建议",
  "parameters": {
    "type": "object",
    "properties": {
      "customerId": {
        "type": "string",
        "description": "顾客ID"
      },
      "type": {
        "type": "string",
        "enum": ["complaint", "suggestion", "praise"],
        "description": "反馈类型：complaint=投诉, suggestion=建议, praise=表扬"
      },
      "content": {
        "type": "string",
        "description": "反馈内容"
      },
      "orderId": {
        "type": "string",
        "description": "关联订单ID（可选）"
      }
    },
    "required": ["customerId", "type", "content"]
  }
}
```

## 对话模板

### 场景1：自然语义点餐

**用户**: 来个两人份的宫保鸡丁套餐，再加一份鱼香肉丝微辣

**Bot响应**:
```
好的，已为您添加到购物车：
🍱 2人经典套餐 x1 - ¥68
🥩 鱼香肉丝(微辣) x1 - ¥26

购物车总计：¥94

请问还需要什么吗？确认下单请说"下单"
```

### 场景2：查询会员

**用户**: 帮我查一下13800138000的会员信息

**Bot响应**:
```
查询到会员信息：
👤 姓名：张三
📱 手机：138****8000
💰 余额：¥328.50
🎫 积分：2,580分
⭐ 等级：黄金会员

请问需要办理什么业务？
```

### 场景3：预约座位

**用户**: 我想预约明天晚上6点，4个人

**Bot响应**:
```
预约成功！🎉

📅 日期：2024-01-15
🕕 时间：18:00
👥 人数：4位
🔖 预约号：BK20240115001

请按时到店，到店后出示预约号即可入座。
如有变动请提前取消预约。

请问还有其他需要吗？
```

### 场景4：排队取号

**用户**: 取个号，我们3个人

**Bot响应**:
```
排队成功！🎉

🔢 排队号：A008
👥 人数：3位
⏱️ 预计等待：约15分钟

当前叫号：A003

您可以先逛逛，快轮到时会通知您。
```

### 场景5：优惠券使用

**用户**: 我有优惠券可以用吗

**Bot响应**:
```
您有以下可用优惠券：
🎫 新用户首单立减 - 满50减10
🎫 满100减20 - 满100可用

建议使用"满100减20"，可节省20元！
需要我帮您使用吗？
```

## 扣子平台配置步骤

### 1. 创建Bot

1. 登录扣子平台 (coze.cn)
2. 点击"创建Bot"
3. 填写Bot信息：
   - 名称：雨姗AI点餐助手
   - 描述：智能餐饮点餐助手
   - 图标：上传店铺Logo

### 2. 配置MCP工具

1. 在Bot配置页面，点击"添加能力"
2. 选择"MCP工具"
3. 点击"添加服务器"
4. 填写服务器配置：
   - 服务器名称：雨姗AI收银助手
   - 服务器URL：https://your-domain.com
   - 认证方式：Bearer Token
   - Token：您的API Token

5. 从工具列表中选择需要的工具（建议全选）

### 3. 配置开场白

```
👋 您好！我是雨姗AI点餐助手。

我可以帮您：
🍽️ 点餐下单 - 直接告诉我想吃什么
📋 查看菜单 - 告诉您今日招牌和推荐
👤 会员服务 - 查询余额、积分
🎫 优惠券 - 查券、用券
📅 预约订座 - 提前预约座位
🔢 排队取号 - 免等候取号
❓ 其他问题 - WiFi、停车、营业时间等

请问有什么可以帮您的？
```

### 4. 配置人设与性格

```
你是雨姗AI收银助手的智能客服，特点：
- 专业友好，热情主动
- 善于根据顾客口味推荐菜品
- 熟悉各类优惠券和会员权益
- 能够处理点餐、预约、排队等各类需求
- 遇到无法处理的问题会自动转人工
```

### 5. 发布到企业微信

1. 在Bot配置页面，点击"发布"
2. 选择"企业微信"渠道
3. 绑定企业微信群或机器人
4. 完成发布

## 常见问题

### Q1: 如何获取API Token？
A: 在雨姗AI收银助手管理后台 → 系统设置 → API管理 中创建。

### Q2: 支付如何对接？
A: 支持微信支付Native模式，需在管理后台配置微信支付商户号和API密钥。

### Q3: 如何支持语音点餐？
A: 扣子平台支持语音输入，用户可以直接语音说菜名，Bot会自动识别。

### Q4: 如何处理外卖配送？
A: 配置配送地址后，系统会生成配送订单，可对接第三方配送平台。

### Q5: 会员如何注册？
A: 支持两种方式：
1. 用户说"注册会员+手机号"，Bot自动注册
2. 在管理后台手动添加

## 技术支持

- 官方网站：https://yushan.ai
- 技术文档：https://docs.yushan.ai
- 客服热线：400-xxx-xxxx
- 邮箱：support@yushan.ai

## 更新日志

### v4.3.0 (2024-01)
- 新增26个MCP标准工具
- 优化自然语义理解
- 新增智能推荐引擎
- 新增全场景FAQ答疑
- 支持多模态交互

### v4.2.0 (2023-12)
- 新增可插拔适配器架构
- 支持美团、银豹、哗啦啦等主流收银系统对接
- 新增打印旁路兜底方案

### v4.1.0 (2023-11)
- 基础点餐功能上线
- 会员系统上线
- 支付集成上线
