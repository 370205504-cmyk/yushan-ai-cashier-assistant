const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'web')));

const sampleData = {
  dishes: [
    { id: '1', name: '糖醋里脊', price: 48, category: '招牌菜', description: '酸甜可口，外酥里嫩', image: '🍖' },
    { id: '2', name: '水煮肉片', price: 58, category: '特色硬菜', description: '麻辣鲜香，下饭神器', image: '🌶️' },
    { id: '3', name: '红烧茄子', price: 28, category: '家常炒菜', description: '软糯入味，经济实惠', image: '🍆' },
    { id: '4', name: '西红柿炒蛋', price: 22, category: '家常炒菜', description: '经典家常菜', image: '🍅' },
    { id: '5', name: '酸辣土豆丝', price: 18, category: '餐前开胃', description: '酸辣爽口，开胃必备', image: '🥔' },
    { id: '6', name: '宫保鸡丁', price: 42, category: '招牌菜', description: '香辣微甜，鸡肉嫩滑', image: '🍗' },
    { id: '7', name: '鱼香肉丝', price: 38, category: '特色硬菜', description: '咸甜酸辣，四味俱全', image: '🥩' },
    { id: '8', name: '紫菜蛋花汤', price: 15, category: '汤羹主食', description: '清淡营养', image: '🍲' },
    { id: '9', name: '米饭', price: 3, category: '汤羹主食', description: '东北大米，香软可口', image: '🍚' },
    { id: '10', name: '红烧肉', price: 68, category: '招牌菜', description: '肥而不腻，入口即化', image: '🥓' }
  ],
  tables: [
    { id: 'A1', name: 'A1桌(4人)', status: 'available' },
    { id: 'A2', name: 'A2桌(4人)', status: 'available' },
    { id: 'A3', name: 'A3桌(6人)', status: 'available' },
    { id: 'B1', name: 'B1包间(10人)', status: 'available' },
    { id: 'B2', name: 'B2包间(12人)', status: 'available' }
  ],
  store: {
    name: '雨姗AI收银助手创味菜',
    address: '河南省商丘市县',
    phone: '0370-1234567',
    hours: '10:00 - 22:00',
    wifi: { name: 'Yushan-Free', password: '88888888' }
  }
};

let orders = [];
let cart = {};

app.get('/api/v1/store/info', (req, res) => {
  res.json({ success: true, data: sampleData.store });
});

app.get('/api/v1/dishes/list', (req, res) => {
  const { category } = req.query;
  let dishes = sampleData.dishes;
  if (category && category !== '全部') {
    dishes = dishes.filter(d => d.category === category);
  }
  res.json({ success: true, data: { items: dishes, total: dishes.length } });
});

app.get('/api/v1/dishes/categories', (req, res) => {
  const categories = [...new Set(sampleData.dishes.map(d => d.category))];
  res.json({ success: true, data: ['全部', ...categories] });
});

app.get('/api/v1/tables/list', (req, res) => {
  res.json({ success: true, data: sampleData.tables });
});

app.post('/api/v1/cart/add', (req, res) => {
  const { userId, dishId, quantity = 1, remarks = '' } = req.body;
  const dish = sampleData.dishes.find(d => d.id === dishId);
  if (!dish) {
    return res.json({ success: false, message: '菜品不存在' });
  }

  if (!cart[userId]) cart[userId] = [];

  const existItem = cart[userId].find(item => item.dishId === dishId);
  if (existItem) {
    existItem.quantity += quantity;
  } else {
    cart[userId].push({ dishId, name: dish.name, price: dish.price, quantity, remarks });
  }

  const total = cart[userId].reduce((sum, item) => sum + item.price * item.quantity, 0);
  res.json({ success: true, data: { items: cart[userId], total, itemCount: cart[userId].length } });
});

app.get('/api/v1/cart/:userId', (req, res) => {
  const { userId } = req.params;
  const items = cart[userId] || [];
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  res.json({ success: true, data: { items, total, itemCount: items.length } });
});

app.delete('/api/v1/cart/:userId/clear', (req, res) => {
  const { userId } = req.params;
  cart[userId] = [];
  res.json({ success: true, message: '购物车已清空' });
});

app.post('/api/v1/orders/create', (req, res) => {
  const { userId, tableNo, type = 'dine_in', remarks = '' } = req.body;
  const items = cart[userId] || [];

  if (items.length === 0) {
    return res.json({ success: false, message: '购物车是空的' });
  }

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const order = {
    orderNo: 'ORD' + Date.now(),
    items,
    totalAmount: total,
    finalAmount: total,
    tableNo,
    type,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  orders.push(order);
  cart[userId] = [];

  res.json({ success: true, data: { orderNo: order.orderNo, totalAmount: order.totalAmount, finalAmount: order.finalAmount } });
});

app.get('/api/v1/orders/:userId', (req, res) => {
  const { userId } = req.params;
  const userOrders = orders.filter(o => o.items.some(() => true));
  res.json({ success: true, data: { orders: userOrders.slice(-10).reverse(), total: userOrders.length } });
});

app.get('/api/v1/queue/status', (req, res) => {
  res.json({ success: true, data: { waiting: Math.floor(Math.random() * 10), avgWait: 15 } });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'admin.html'));
});

app.get('/mobile', (req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'mobile.html'));
});

console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🍽️  雨姗AI收银助手智能餐饮系统 v3.1.0             ║
║                                                   ║
║   演示模式启动成功！                              ║
║                                                   ║
║   访问地址：                                     ║
║   ├─ 顾客端:    http://localhost:${PORT}           ║
║   ├─ 管理后台:  http://localhost:${PORT}/admin     ║
║   └─ 移动端:    http://localhost:${PORT}/mobile    ║
║                                                   ║
║   测试账号:  13800138000                          ║
║   密码:      123456                               ║
║                                                   ║
║   按 Ctrl+C 停止服务                              ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
`);

app.listen(PORT, () => {
  console.log('演示数据已加载: 10道菜品, 5张桌台');
});
