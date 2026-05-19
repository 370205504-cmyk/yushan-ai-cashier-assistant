# API Documentation

# 雨姗AI收银助手创味菜 - API接口文档

## 基础信息

- **Base URL**: `https://mcp.yushan-ai-cashier.com/api/v1`
- **认证方式**: Bearer Token (JWT)
- **Content-Type**: `application/json`

## 统一响应格式

```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": {}
}
```

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

---

## 认证接口

### POST /auth/register
用户注册

**Request Body:**
```json
{
  "phone": "13800138000",
  "password": "123456",
  "nickname": "张三"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": 1,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### POST /auth/login
用户登录

**Request Body:**
```json
{
  "phone": "13800138000",
  "password": "123456"
}
```

### POST /auth/wechat/login
微信登录

**Request Body:**
```json
{
  "code": "微信授权码"
}
```

---

## 菜品接口

### GET /dishes/dishes
获取菜品列表

**Query Parameters:**
| 参数 | 类型 | 说明 |
|------|------|------|
| category | string | 菜品分类 |
| available | boolean | 是否上架 |
| page | number | 页码 |
| pageSize | number | 每页数量 |

**Response:**
```json
{
  "success": true,
  "data": {
    "dishes": [
      {
        "id": 1,
        "name": "招牌大鱼头泡饭",
        "category": "招牌菜",
        "price": 88.00,
        "description": "雨姗AI收银助手头牌菜"
      }
    ],
    "total": 120
  }
}
```

### GET /dishes/dish/:id
获取菜品详情

---

## 订单接口

### POST /order/create
创建订单

**Request Body:**
```json
{
  "items": [
    {"dishId": 1, "quantity": 1}
  ],
  "type": "dine_in",
  "tableNo": "A01",
  "remarks": "少辣"
}
```

| 订单类型 | 说明 |
|----------|------|
| dine_in | 堂食 |
| takeout | 外带 |
| delivery | 外卖 |

### GET /order/list
获取订单列表

### GET /order/:orderNo
获取订单详情

### PUT /order/:orderNo/cancel
取消订单

---

## 排队接口

### POST /queue/take
排队取号

**Request Body:**
```json
{
  "store_id": "store001",
  "table_type": "medium",
  "people": 4
}
```

| 桌型 | 说明 |
|------|------|
| small | 小桌(1-3人) |
| medium | 中桌(4-6人) |
| large | 大桌(7-10人) |
| 包间 | 包间 |

**Response:**
```json
{
  "success": true,
  "data": {
    "queueId": "QUEUE123456",
    "queueNo": "A025",
    "storeName": "雨姗AI收银助手(孔祖大道店)",
    "tableType": "中桌",
    "people": 4,
    "waitCount": 5,
    "estimatedTime": 50
  }
}
```

### GET /queue/query/:queueId
查询排队进度

### POST /queue/cancel/:queueId
取消排队

### POST /queue/call
叫号(商家使用)

---

## 会员接口

### GET /member/info
获取会员信息

**Response:**
```json
{
  "success": true,
  "data": {
    "level": 2,
    "levelName": "银卡会员",
    "points": 1500,
    "balance": 200.00,
    "orderCount": 25,
    "totalSpent": 2500.00
  }
}
```

### POST /member/recharge
余额充值

**Request Body:**
```json
{
  "amount": 500
}
```

### GET /member/coupons
获取优惠券

**Query Parameters:**
| 参数 | 说明 |
|------|------|
| status | unused/used/expired |

### POST /member/coupons/claim
领取优惠券

**Request Body:**
```json
{
  "code": "WELCOME10"
}
```

---

## 支付接口

### POST /payment/create
创建支付

**Request Body:**
```json
{
  "orderNo": "ORD20260115123456",
  "method": "wechat",
  "finalAmount": 188.00
}
```

| 支付方式 | 说明 |
|----------|------|
| wechat | 微信支付 |
| alipay | 支付宝 |
| balance | 余额支付 |

### GET /payment/status/:orderNo
查询支付状态

### POST /payment/refund
申请退款

**Request Body:**
```json
{
  "orderNo": "ORD20260115123456",
  "amount": 188.00,
  "reason": "菜品质量问题"
}
```

---

## 管理接口

> 需要管理员权限

### GET /admin/dashboard
仪表盘数据

**Response:**
```json
{
  "success": true,
  "data": {
    "today": {
      "orders": 45,
      "revenue": 5680.00,
      "customers": 38
    },
    "orderStatus": [
      {"status": "pending", "count": 5},
      {"status": "preparing", "count": 12}
    ],
    "topDishes": [
      {"dish_name": "招牌大鱼头泡饭", "total": 28}
    ],
    "stockAlerts": []
  }
}
```

### GET /admin/orders
订单管理

### PUT /admin/orders/:orderNo/status
更新订单状态

**Request Body:**
```json
{
  "status": "preparing"
}
```

### POST /admin/orders/:orderNo/print
重打小票

### GET /admin/dishes
菜品列表

### POST /admin/dishes
添加菜品

### PUT /admin/dishes/:id
更新菜品

### DELETE /admin/dishes/:id
删除菜品

### GET /admin/queues
排队管理

### POST /admin/queues/:queueId/call
叫号

### GET /admin/stats/compare
同比统计

---

## 统计接口

> 需要管理员权限

### GET /analytics/revenue
营收统计

**Query Parameters:**
| 参数 | 说明 |
|------|------|
| startDate | 开始日期 |
| endDate | 结束日期 |
| groupBy | hour/day/week/month |

### GET /analytics/dishes
菜品统计

### GET /analytics/customers
客户统计

### GET /analytics/hourly
时段统计

### GET /analytics/categories
分类统计

### GET /analytics/export
导出报表

---

## AI对话接口

### POST /agent/text
自然语言对话

**Request Body:**
```json
{
  "query": "给我推荐招牌菜",
  "userId": "user_001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reply": "🌟 今日推荐：\n1. 招牌大鱼头泡饭 ¥88\n2. 招牌烧肉 ¥58\n\n请问想点哪几道？"
  }
}
```

---

## 错误码

| 错误码 | 说明 |
|--------|------|
| 1001 | 参数错误 |
| 1002 | 必填参数缺失 |
| 2001 | 用户不存在 |
| 2002 | 密码错误 |
| 2003 | Token无效 |
| 3001 | 菜品不存在 |
| 3002 | 库存不足 |
| 4001 | 订单不存在 |
| 4002 | 订单无法取消 |
| 5001 | 支付失败 |
| 5002 | 退款失败 |
| 6001 | 排队不存在 |
