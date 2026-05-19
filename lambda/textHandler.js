const dishes = require('./data/dishes.json');
const stores = require('./config.json');
const cartService = require('./services/cartService');
const queueService = require('./services/queueService');

const intentPatterns = {
  greeting: /^(你好|您好|hi|hello|hi呀|在吗|在不)/i,
  menu: /(查看|看看|给我|给我看看|有没有|都有)(.*)?(菜单|菜|菜品|菜式)/i,
  recommend: /(推荐|招牌|好吃|特色|热门|畅销)(.*)?(菜|菜品)/i,
  order: /(来|点|加|要)(.*)?(一份|个|份|盘)/i,
  cart: /(购物车|看看购物车|有什么)/i,
  checkout: /(下单|结账|付款|买单|提交订单)/i,
  cancel: /(取消|退|不要了)/i,
  queryOrder: /(查|看|我的)(.*)?(订单|单)/i,
  queue: /(排队|取号|排个|叫号)/i,
  cancelQueue: /(不排了|取消排队|退号)/i,
  address: /(地址|在哪|怎么去|位置)/i,
  phone: /(电话|联系方式|手机号)/i,
  hours: /(营业|几点|开门|关门|时间)/i,
  wifi: /(wifi|wi-fi|无线网|网络|密码)/i,
  takeout: /(外卖|送餐|打包|带走)/i,
  parking: /(停车|停车场|停车费)/i,
  bookTable: /(预约|预订|订座|包间)/i,
  activity: /(活动|优惠|折扣|促销)/i,
  invoice: /(发票|开票|电子发票)/i,
  children: /(儿童|小孩|宝宝|座椅|儿童椅)/i,
  pet: /(宠物|猫|狗|动物)/i,
  powerbank: /(充电宝|充电|充电桩|手机没电)/i,
  help: /(帮助|help|帮忙|怎么用|功能)/i
};

const storeInfo = stores.restaurant || {
  name: '雨姗AI收银助手创味菜',
  address: '县孔祖大道南段',
  phone: '0370-628-8888',
  hours: '10:00-22:00'
};

const wifiInfo = stores.wifi?.default || {
  ssid: '雨姗AI收银助手免费WiFi',
  password: '88888888'
};

class TextHandler {
  constructor() {
    this.contexts = new Map();
  }

  async handle(query, userId, sessionId = null) {
    const cleanQuery = query.trim();
    const userContext = this.getContext(userId);

    if (intentPatterns.greeting.test(cleanQuery)) {
      return this.handleGreeting(userContext);
    }

    if (intentPatterns.menu.test(cleanQuery)) {
      return this.handleMenu(cleanQuery, userContext);
    }

    if (intentPatterns.recommend.test(cleanQuery)) {
      return this.handleRecommend(cleanQuery, userContext);
    }

    if (intentPatterns.order.test(cleanQuery)) {
      return this.handleOrder(cleanQuery, userId, userContext);
    }

    if (intentPatterns.cart.test(cleanQuery)) {
      return this.handleCart(userId);
    }

    if (intentPatterns.checkout.test(cleanQuery)) {
      return this.handleCheckout(userId);
    }

    if (intentPatterns.cancel.test(cleanQuery)) {
      return this.handleCancel(cleanQuery, userId);
    }

    if (intentPatterns.queryOrder.test(cleanQuery)) {
      return this.handleQueryOrder(userId);
    }

    if (intentPatterns.queue.test(cleanQuery)) {
      return this.handleQueue(cleanQuery, userId);
    }

    if (intentPatterns.cancelQueue.test(cleanQuery)) {
      return this.handleCancelQueue(cleanQuery, userId, userContext);
    }

    if (intentPatterns.address.test(cleanQuery)) {
      return this.handleAddress();
    }

    if (intentPatterns.phone.test(cleanQuery)) {
      return this.handlePhone();
    }

    if (intentPatterns.hours.test(cleanQuery)) {
      return this.handleHours();
    }

    if (intentPatterns.wifi.test(cleanQuery)) {
      return this.handleWifi();
    }

    if (intentPatterns.takeout.test(cleanQuery)) {
      return this.handleTakeout();
    }

    if (intentPatterns.parking.test(cleanQuery)) {
      return this.handleParking();
    }

    if (intentPatterns.bookTable.test(cleanQuery)) {
      return this.handleBookTable();
    }

    if (intentPatterns.activity.test(cleanQuery)) {
      return this.handleActivity();
    }

    if (intentPatterns.invoice.test(cleanQuery)) {
      return this.handleInvoice();
    }

    if (intentPatterns.children.test(cleanQuery)) {
      return this.handleChildren();
    }

    if (intentPatterns.pet.test(cleanQuery)) {
      return this.handlePet();
    }

    if (intentPatterns.powerbank.test(cleanQuery)) {
      return this.handlePowerbank();
    }

    if (intentPatterns.help.test(cleanQuery)) {
      return this.handleHelp();
    }

    return this.handleUnknown(cleanQuery, userContext);
  }

  getContext(userId) {
    if (!this.contexts.has(userId)) {
      this.contexts.set(userId, {
        lastIntent: null,
        lastCategory: null,
        lastDishId: null,
        awaitingConfirmation: false,
        queueId: null
      });
    }
    return this.contexts.get(userId);
  }

  handleGreeting(context) {
    return {
      success: true,
      type: 'text',
      message: `欢迎光临${storeInfo.name}！🙏

我是您的智能点餐助手，可以帮您：

🍽️ 查看菜单和推荐菜品
🛒 添加菜品到购物车
📦 提交订单和查看订单
📍 了解门店地址、WiFi等信息
🎫 排队取号和查询排队进度

请问有什么可以帮您？`,
      context: context
    };
  }

  handleMenu(query, context) {
    let category = null;
    if (query.includes('招牌')) category = '招牌菜';
    else if (query.includes('硬菜') || query.includes('特色')) category = '特色硬菜';
    else if (query.includes('宴请')) category = '宴请首选';
    else if (query.includes('开胃') || query.includes('凉菜')) category = '餐前开胃';
    else if (query.includes('家常') || query.includes('炒菜')) category = '家常炒菜';
    else if (query.includes('汤') || query.includes('主食') || query.includes('饮品')) category = '汤羹主食';

    let menuItems = dishes;
    if (category) {
      menuItems = dishes.filter(d => d.category === category);
    }

    context.lastIntent = 'menu';
    context.lastCategory = category;

    let response = category ? `【${category}】菜单：\n\n` : '【全部菜单】\n\n';

    const grouped = menuItems.reduce((acc, dish) => {
      if (!acc[dish.category]) acc[dish.category] = [];
      acc[dish.category].push(dish);
      return acc;
    }, {});

    for (const [cat, items] of Object.entries(grouped)) {
      response += `📂 ${cat}：\n`;
      items.forEach(dish => {
        const recommendTag = dish.isRecommend || dish.isSignature ? ' ⭐' : '';
        response += `  • ${dish.name} ¥${dish.price}${recommendTag}\n`;
        if (dish.description) {
          response += `    ${dish.description}\n`;
        }
      });
      response += '\n';
    }

    response += '回复菜品名称即可添加到购物车，如"来一份招牌大鱼头泡饭"';

    return { success: true, type: 'text', message: response, context };
  }

  handleRecommend(query, context) {
    const recommended = dishes.filter(d => d.isRecommend || d.isSignature);

    let response = '🌟 今日推荐：\n\n';

    recommended.slice(0, 6).forEach((dish, i) => {
      response += `${i + 1}. ${dish.name} ¥${dish.price}\n`;
      response += `   ${dish.description || '精选推荐'}\n\n`;
    });

    response += '请问想点哪几道？直接说菜品名称即可';

    context.lastIntent = 'recommend';

    return { success: true, type: 'text', message: response, context };
  }

  async handleOrder(query, userId, context) {
    const dishPatterns = [
      /来?一份?(.+?)(少辣|微辣|不要|多辣|加辣)?(.+)?$/,
      /点?(.+?)(少辣|微辣|不要|多辣|加辣)?(.+)?$/,
      /加?(.+?)(少辣|微辣|不要|多辣|加辣)?$/,
      /要?(.+)$/
    ];

    let dishName = null;
    let remarks = [];

    for (const pattern of dishPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        dishName = match[1].trim();
        if (match[2]) remarks.push(match[2]);
        break;
      }
    }

    if (!dishName) {
      return { success: false, type: 'text', message: '抱歉，我没有理解您想点的菜品，请说清楚菜品名称', context };
    }

    const matchedDish = dishes.find(d =>
      d.name.includes(dishName) || dishName.includes(d.name) ||
      d.name.includes(dishName.replace(/[来点加要]/g, ''))
    );

    if (!matchedDish) {
      return {
        success: false,
        type: 'text',
        message: `没有找到"${dishName}"这道菜，您可以查看菜单后告诉我菜品名称`,
        context
      };
    }

    try {
      await cartService.addItem(userId, matchedDish.id, 1, remarks.join(' '));

      context.lastIntent = 'order';
      context.lastDishId = matchedDish.id;
      context.awaitingConfirmation = true;

      return {
        success: true,
        type: 'text',
        message: `✅ 已添加到购物车：
${matchedDish.name} x1 ¥${matchedDish.price}
${remarks.length ? '备注：' + remarks.join(', ') : ''}

当前购物车已更新，还需要其他菜吗？
回复"查看购物车"或"下单"继续`,
        context,
        data: {
          dishId: matchedDish.id,
          dishName: matchedDish.name,
          price: matchedDish.price
        }
      };
    } catch (error) {
      return { success: false, type: 'text', message: '添加失败：' + error.message, context };
    }
  }

  async handleCart(userId) {
    try {
      const cart = await cartService.getCart(userId);

      if (!cart || cart.items.length === 0) {
        return {
          success: true,
          type: 'text',
          message: '🛒 购物车是空的，请先选择菜品\n\n回复"给我看看菜单"开始点餐',
          context: this.getContext(userId)
        };
      }

      let response = `🛒 购物车（共${cart.items.length}件）：\n\n`;
      let total = 0;

      cart.items.forEach((item, i) => {
        response += `${i + 1}. ${item.name} x${item.quantity} ¥${item.subtotal}\n`;
        if (item.remarks) response += `   备注：${item.remarks}\n`;
        total += item.subtotal;
      });

      response += `\n─────────────────`;
      response += `\n合计：¥${total.toFixed(2)}`;

      return {
        success: true,
        type: 'text',
        message: response,
        context: this.getContext(userId)
      };
    } catch (error) {
      return { success: false, type: 'text', message: '查询失败：' + error.message };
    }
  }

  async handleCheckout(userId) {
    try {
      const cart = await cartService.getCart(userId);

      if (!cart || cart.items.length === 0) {
        return { success: false, type: 'text', message: '购物车是空的，请先点菜' };
      }

      const total = cart.items.reduce((sum, item) => sum + item.subtotal, 0);

      return {
        success: true,
        type: 'confirm',
        message: `📋 确认订单：

${cart.items.map((item, i) => `${i + 1}. ${item.name} x${item.quantity}`).join('\n')}

─────────────────
合计：¥${total.toFixed(2)}

请确认是否下单？
回复"确认下单"或"取消"`,
        context: this.getContext(userId)
      };
    } catch (error) {
      return { success: false, type: 'text', message: '下单失败：' + error.message };
    }
  }

  async handleCancel(query, userId) {
    if (query.includes('订单')) {
      return { success: true, type: 'text', message: '取消订单请告诉我订单号，或回复"查看我的订单"找到订单后说"取消订单"' };
    }
    if (query.includes('购物车') || query.includes('购物')) {
      await cartService.clearCart(userId);
      return { success: true, type: 'text', message: '✅ 购物车已清空' };
    }
    return { success: true, type: 'text', message: '好的，已取消' };
  }

  async handleQueryOrder(userId) {
    return {
      success: true,
      type: 'text',
      message: '查询订单功能开发中...
请访问 http://localhost:3000/mobile 查看您的订单'
    };
  }

  async handleQueue(query, userId, context) {
    const peopleMatch = query.match(/(\d)[人位桌]/);
    const people = peopleMatch ? parseInt(peopleMatch[1]) : 3;

    const tableTypeMatch = query.match(/(小|中|大|包间)?[桌位]/);
    let tableType = 'small';
    if (query.includes('中桌') || query.includes('4') || query.includes('5') || query.includes('6')) tableType = 'medium';
    if (query.includes('大桌') || query.includes('7') || query.includes('8') || query.includes('9') || query.includes('10')) tableType = 'large';
    if (query.includes('包间')) tableType = '包间';

    const storeId = stores.default_store_id || 'store001';

    try {
      const result = await queueService.takeQueue(storeId, tableType, people, userId);

      if (result.success) {
        context.queueId = result.data.queueId;
        return {
          success: true,
          type: 'text',
          message: `🎫 取号成功！

门店：${result.data.storeName}
排队号：${result.data.queueNo}
桌型：${result.data.tableType}
人数：${result.data.people}人
当前等待：${result.data.waitCount}桌
预计等待：约${result.data.estimatedTime}分钟

请留意叫号，到号后请入座消费
排队ID：${result.data.queueId}`,
          context
        };
      } else {
        return { success: false, type: 'text', message: result.message, context };
      }
    } catch (error) {
      return { success: false, type: 'text', message: '取号失败：' + error.message, context };
    }
  }

  async handleCancelQueue(query, userId, context) {
    if (!context.queueId) {
      return {
        success: false,
        type: 'text',
        message: '您当前没有排队的记录'
      };
    }

    try {
      const result = await queueService.cancelQueue(context.queueId);
      if (result.success) {
        context.queueId = null;
        return { success: true, type: 'text', message: '✅ 排队已取消，欢迎下次光临！' };
      }
      return { success: false, type: 'text', message: result.message };
    } catch (error) {
      return { success: false, type: 'text', message: '取消失败：' + error.message };
    }
  }

  handleAddress() {
    return {
      success: true,
      type: 'text',
      message: `📍 门店地址：

${storeInfo.name}
地址：${storeInfo.address}
电话：${storeInfo.phone}
营业时间：${storeInfo.hours}

祝您用餐愉快！`
    };
  }

  handlePhone() {
    return {
      success: true,
      type: 'text',
      message: `📞 联系电话：

${storeInfo.phone}
服务时间：${storeInfo.hours}

欢迎来电咨询和预订！`
    };
  }

  handleHours() {
    return {
      success: true,
      type: 'text',
      message: `🕐 营业时间：

${storeInfo.hours}

节假日可能有调整，请以门店公告为准。`
    };
  }

  handleWifi() {
    return {
      success: true,
      type: 'text',
      message: `📶 WiFi信息：

名称(SSID)：${wifiInfo.ssid}
密码：${wifiInfo.password}

免密码连接，欢迎使用！`
    };
  }

  handleTakeout() {
    return {
      success: true,
      type: 'text',
      message: `🥡 外卖服务：

我们支持以下外卖平台：
• 美团外卖
• 饿了么

您可以在外卖平台上搜索"${storeInfo.name}"下单

配送范围：门店周边3公里内
配送费：按平台标准收取
预计送达：30-45分钟

感谢您的支持！`
    };
  }

  handleParking() {
    return {
      success: true,
      type: 'text',
      message: `🅿️ 停车信息：

门店旁设有免费停车场
提供约50个车位

停车收费标准：
• 前1小时：免费
• 超出部分：5元/小时
• 24小时封顶：30元

消费满100元可免费停车2小时（需到前台登记车牌）`
    };
  }

  handleBookTable() {
    return {
      success: true,
      type: 'text',
      message: `📅 预订服务：

欢迎预订包间和宴席！

预订电话：${storeInfo.phone}
服务时间：${storeInfo.hours}

包间说明：
• 小包：4-6人，适合朋友聚餐
• 中包：8-10人，适合家庭聚会
• 大包：12-20人，适合商务宴请

预订请提前告知：
1. 用餐日期和时间
2. 用餐人数
3. 预算标准
4. 特殊要求（如忌口）`
    };
  }

  handleActivity() {
    const activity = stores.activity || '暂无活动';
    return {
      success: true,
      type: 'text',
      message: `🎁 最新活动：

${activity}

更多优惠请关注门店公告或致电咨询！`
    };
  }

  handleInvoice() {
    return {
      success: true,
      type: 'text',
      message: `🧾 发票开具：

支持开具以下发票：
• 增值税普通发票
• 增值税专用发票（需提供企业资质）

开票方式：
1. 消费后凭小票到收银台开具
2. 联系门店电话开具电子发票

发票内容：餐饮服务
税率：6%`
    };
  }

  handleChildren() {
    return {
      success: true,
      type: 'text',
      message: `👶 儿童服务：

✅ 免费提供儿童座椅
✅ 免费提供儿童餐具
✅ 免费提供围兜

如有需要请告知服务员，我们会为您准备。`
    };
  }

  handlePet() {
    return {
      success: true,
      type: 'text',
      message: `🐾 宠物政策：

❌ 宠物不可进入餐厅室内区域

如您携带宠物前来，请将宠物留在店外或联系服务员获取帮助。

感谢您的理解与配合！`
    };
  }

  handlePowerbank() {
    return {
      success: true,
      type: 'text',
      message: `🔋 充电宝服务：

餐厅内设有共享充电宝：
• 怪兽充电
• 来电

扫码即可借用，费用按平台标准收取

如需帮助请联系服务员！`
    };
  }

  handleHelp() {
    return {
      success: true,
      type: 'text',
      message: `🤖 我可以帮您：

【点餐相关】
• "给我看看菜单" - 查看所有菜品
• "推荐几道招牌菜" - 获取推荐
• "来一份xxx" - 添加菜品到购物车
• "查看购物车" - 查看已选菜品
• "下单" - 提交订单

【服务查询】
• "门店地址在哪" - 获取地址
• "WiFi密码" - 获取WiFi
• "营业时间" - 查看营业时间
• "电话多少" - 联系电话

【排队相关】
• "帮我排个3人桌" - 排队取号
• "还要等多久" - 查询排队进度

【其他服务】
• "停车收费吗" - 停车信息
• "有包间吗" - 包间预订
• "能开发票吗" - 发票说明

还有什么可以帮您？`
    };
  }

  handleUnknown(query, context) {
    const matchedDish = dishes.find(d =>
      d.name.includes(query) || query.includes(d.name)
    );

    if (matchedDish) {
      return {
        success: true,
        type: 'text',
        message: `您是在找"${matchedDish.name}"吗？

💰 价格：¥${matchedDish.price}
📂 分类：${matchedDish.category}
${matchedDish.description ? '📝 ' + matchedDish.description : ''}

回复"来一份${matchedDish.name}"添加到购物车`,
        context
      };
    }

    return {
      success: false,
      type: 'text',
      message: `抱歉，我没有理解"${query}"

您可以试试：
• "给我看看菜单" - 查看菜品
• "推荐招牌菜" - 获取推荐
• "WiFi密码" - 获取WiFi
• "帮我" - 查看所有功能

或者直接说出您想点的菜名，如"来一份糖醋里脊"`,
      context
    };
  }
}

module.exports = new TextHandler();
