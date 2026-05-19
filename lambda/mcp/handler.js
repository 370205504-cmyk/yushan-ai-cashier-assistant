/**
 * MCP处理器 v2.0 - AI虚拟前台核心
 * 整合：自然语义理解 + 智能推荐 + FAQ答疑 + 多模态交互 + 自动转人工
 */

const MCPTools = require('./tools');
const ContextManager = require('./context');
const RecommendationEngine = require('../services/recommendation-engine');
const FAQSystem = require('../services/faq-system');
const MultimodalProcessor = require('../services/multimodal-processor');

class MCPHandler {
  constructor() {
    this.tools = new MCPTools();
    this.context = new ContextManager();
    this.recommendationEngine = null;
    this.faqSystem = new FAQSystem();
    this.multimodalProcessor = new MultimodalProcessor();
    
    this.unknownIntentCount = new Map();
    
    this.intents = [
      {
        name: 'ORDER_DISH',
        patterns: ['来个', '我要', '给我来', '点一份', '再加一份', '再来一个', '份', '两个'],
        keywords: ['份', '个', '盘', '碗'],
        confidence: 0.9
      },
      {
        name: 'REMOVE_FROM_CART',
        patterns: ['不要了', '退掉', '取消', '去掉', '不要这个'],
        keywords: ['不要', '取消', '退'],
        confidence: 0.85
      },
      {
        name: 'VIEW_CART',
        patterns: ['看看购物车', '我的订单', '点了什么', '查看订单'],
        keywords: ['购物车', '订单'],
        confidence: 0.9
      },
      {
        name: 'MODIFY_ORDER',
        patterns: ['不要香菜', '少辣', '加辣', '微辣', '不要葱', '多放', '少放'],
        keywords: ['不要', '少', '多', '加', '辣', '香菜', '葱'],
        confidence: 0.8
      },
      {
        name: 'CONFIRM_ORDER',
        patterns: ['好的', '可以', '就这样', '下单', '提交', '确认', '要了', '行'],
        keywords: ['下单', '提交', '确认', '要'],
        confidence: 0.9
      },
      {
        name: 'QUERY_MENU',
        patterns: ['有什么', '推荐', '菜单', '招牌', '有什么好吃的'],
        keywords: ['菜单', '推荐', '招牌', '有什么'],
        confidence: 0.85
      },
      {
        name: 'REPEAT_ORDER',
        patterns: ['跟上次一样', '和上次一样', '老样子', '还点那个'],
        keywords: ['上次', '一样', '老样子'],
        confidence: 0.9
      },
      {
        name: 'ASK_FAQ',
        patterns: ['几点', '怎么', '什么', '能不能', '可以', '有没有', 'WiFi', '停车', '包间'],
        keywords: ['?', '？', '怎么', '什么', '为什么', 'WiFi', '停车', '包间', '打包'],
        confidence: 0.8,
        useFAQ: true
      }
    ];
  }

  /**
   * 初始化推荐引擎
   */
  async init(adapter) {
    if (!this.recommendationEngine) {
      this.recommendationEngine = new RecommendationEngine();
      await this.recommendationEngine.init(adapter);
    }
  }

  /**
   * 识别用户意图（带置信度）
   */
  recognizeIntent(message) {
    const msg = message.toLowerCase();
    
    let bestMatch = null;
    let bestScore = 0;
    
    for (const intent of this.intents) {
      let score = 0;
      
      const patternMatch = intent.patterns.some(p => msg.includes(p));
      if (patternMatch) {
        score += intent.confidence;
      }
      
      const keywordMatch = intent.keywords.some(k => msg.includes(k));
      if (keywordMatch) {
        score += 0.3;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { ...intent, score };
      }
    }
    
    // 阈值判断
    if (bestScore >= 0.5) {
      return { intent: bestMatch.name, confidence: bestMatch.score, useFAQ: bestMatch.useFAQ };
    }
    
    return { intent: 'UNKNOWN', confidence: 0, useFAQ: false };
  }

  /**
   * 检查是否需要转人工
   */
  needsHumanTransfer(sessionId, intent, message) {
    const lowerMsg = message.toLowerCase();
    
    // 1. 复杂问题直接转人工
    const complexPatterns = [
      '投诉', '退款', '开发票', '吵架', '生气', '要投诉', 
      '叫你们老板', '经理', '赔偿', '报警', '曝光'
    ];
    if (complexPatterns.some(p => lowerMsg.includes(p))) {
      return true;
    }

    // 2. 连续3次未知意图转人工
    const count = this.unknownIntentCount.get(sessionId) || 0;
    if (intent === 'UNKNOWN' && count >= 3) {
      this.unknownIntentCount.set(sessionId, 0);
      return true;
    }

    // 3. 更新计数
    if (intent === 'UNKNOWN') {
      this.unknownIntentCount.set(sessionId, count + 1);
    } else {
      this.unknownIntentCount.set(sessionId, 0);
    }

    return false;
  }

  /**
   * 生成转人工回复
   */
  getHumanTransferReply() {
    return {
      type: 'transfer_human',
      reply: '抱歉，这个问题我处理不了，让我帮您转接人工客服~',
      qrcode: 'https://example.com/human-service-qrcode.png',
      waitMessage: '人工客服正在赶来，请稍候...'
    };
  }

  /**
   * 处理用户消息（主入口）
   */
  async handleMessage(sessionId, customerId, message, inputType = 'text') {
    try {
      // 1. 记录用户消息
      this.context.addMessage(sessionId, 'user', message);

      // 2. 多模态处理
      let textMessage = message;
      if (inputType !== 'text') {
        const multiResult = await this.multimodalProcessor.process(message, inputType);
        if (multiResult.success && multiResult.text) {
          textMessage = multiResult.text;
        } else if (!multiResult.success) {
          return multiResult;
        }
      }

      // 3. 识别意图
      const { intent, confidence, useFAQ } = this.recognizeIntent(textMessage);

      // 4. 检查是否需要转人工
      if (this.needsHumanTransfer(sessionId, intent, textMessage)) {
        return this.getHumanTransferReply();
      }

      // 5. 优先使用FAQ系统回答问题
      if (useFAQ || intent === 'ASK_FAQ') {
        const profile = this.context.getCustomerProfile(customerId);
        const faqResult = this.faqSystem.answer(textMessage, { customerProfile: profile });
        
        if (faqResult.type === 'transfer_human') {
          return faqResult;
        }

        this.context.addMessage(sessionId, 'assistant', faqResult.reply);
        return faqResult;
      }

      // 6. 根据意图处理
      let result;
      switch (intent) {
        case 'ORDER_DISH':
          result = await this.handleOrderDish(sessionId, textMessage);
          break;
        case 'REMOVE_FROM_CART':
          result = await this.handleRemoveFromCart(sessionId, textMessage);
          break;
        case 'VIEW_CART':
          result = await this.handleViewCart(sessionId);
          break;
        case 'MODIFY_ORDER':
          result = await this.handleModifyOrder(sessionId, customerId, textMessage);
          break;
        case 'CONFIRM_ORDER':
          result = await this.handleConfirmOrder(sessionId, customerId);
          break;
        case 'QUERY_MENU':
          result = await this.handleQueryMenu(sessionId);
          break;
        case 'REPEAT_ORDER':
          result = await this.handleRepeatOrder(sessionId, customerId);
          break;
        default:
          result = await this.handleWelcome(sessionId, customerId);
      }

      // 7. 记录AI回复
      if (result.reply) {
        this.context.addMessage(sessionId, 'assistant', result.reply);
      }

      // 8. 主动推荐（每次回复都可以附带推荐）
      if (result.type === 'text' && !result.excludeRecommendation) {
        const recommendations = await this.getActiveRecommendations(sessionId, customerId);
        if (recommendations) {
          result.reply += '\n\n' + recommendations;
        }
      }

      return result;
    } catch (e) {
      console.error('MCP处理错误:', e);
      return {
        type: 'error',
        reply: '抱歉，系统有点问题，请稍后再试！'
      };
    }
  }

  /**
   * 获取主动推荐
   */
  async getActiveRecommendations(sessionId, customerId) {
    if (!this.recommendationEngine) {
      return null;
    }

    const session = this.context.getOrCreateSession(sessionId);
    const profile = this.context.getCustomerProfile(customerId);

    const recommendations = await this.recommendationEngine.getComprehensiveRecommendation(
      profile,
      session.currentCart
    );

    return this.recommendationEngine.getRecommendationMessage(recommendations, profile);
  }

  /**
   * 处理点餐
   */
  async handleOrderDish(sessionId, message) {
    const dishesResult = await this.tools.getDishes();
    if (!dishesResult.success) {
      return { type: 'text', reply: '抱歉，暂时无法获取菜单，请稍后再试~' };
    }

    const dishNames = dishesResult.dishes.map(d => d.name);
    let matchedDish = null;

    for (const name of dishNames) {
      if (message.includes(name)) {
        matchedDish = dishesResult.dishes.find(d => d.name === name);
        break;
      }
    }

    if (matchedDish) {
      const quantity = this.extractQuantity(message);
      matchedDish.quantity = quantity;
      this.context.addToCart(sessionId, matchedDish);

      const cart = this.context.getOrCreateSession(sessionId).currentCart;
      const total = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

      return {
        type: 'cart_updated',
        reply: `好的，已添加「${matchedDish.name}」x${quantity} 到购物车~\n\n当前购物车：\n${cart.map(i => `${i.name} x${i.quantity || 1} - ¥${i.price * (i.quantity || 1)}`).join('\n')}\n\n总计：¥${total}`,
        cart,
        excludeRecommendation: true
      };
    }

    return {
      type: 'text',
      reply: '抱歉，我没找到您说的菜品，您可以告诉我完整菜名，或者说"推荐"我帮您推荐~'
    };
  }

  /**
   * 提取数量
   */
  extractQuantity(message) {
    const match = message.match(/(\d+)(?:份|个|碗|盘)?/);
    return match ? parseInt(match[1]) : 1;
  }

  /**
   * 移除购物车
   */
  async handleRemoveFromCart(sessionId, message) {
    const session = this.context.getOrCreateSession(sessionId);
    if (session.currentCart.length === 0) {
      return { type: 'text', reply: '购物车是空的哦~' };
    }

    for (const item of session.currentCart) {
      if (message.includes(item.name)) {
        this.context.removeFromCart(sessionId, item.dishId);
        return {
          type: 'cart_updated',
          reply: `好的，已移除「${item.name}」`,
          cart: this.context.getOrCreateSession(sessionId).currentCart,
          excludeRecommendation: true
        };
      }
    }

    const lastItem = session.currentCart[session.currentCart.length - 1];
    this.context.removeFromCart(sessionId, lastItem.dishId);
    return {
      type: 'cart_updated',
      reply: `好的，已移除最后一个「${lastItem.name}」`,
      cart: this.context.getOrCreateSession(sessionId).currentCart,
      excludeRecommendation: true
    };
  }

  /**
   * 查看购物车
   */
  async handleViewCart(sessionId) {
    const session = this.context.getOrCreateSession(sessionId);
    if (session.currentCart.length === 0) {
      return { type: 'text', reply: '购物车是空的哦，想吃点什么呢？' };
    }

    const total = session.currentCart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    const itemsText = session.currentCart.map(i => `${i.name} x${i.quantity || 1} - ¥${i.price * (i.quantity || 1)}`).join('\n');

    return {
      type: 'cart_view',
      reply: `您的购物车：\n\n${itemsText}\n\n总计：¥${total}\n\n确认下单吗？`,
      cart: session.currentCart,
      total,
      excludeRecommendation: true
    };
  }

  /**
   * 处理订单修改
   */
  async handleModifyOrder(sessionId, customerId, message) {
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('香菜')) {
      this.context.addDislike(customerId, '香菜');
    }
    if (lowerMsg.includes('葱')) {
      this.context.addDislike(customerId, '葱');
    }
    if (lowerMsg.includes('辣') && !lowerMsg.includes('不辣')) {
      if (lowerMsg.includes('微辣')) {
        this.context.addTastePreference(customerId, '微辣');
      } else if (lowerMsg.includes('中辣')) {
        this.context.addTastePreference(customerId, '中辣');
      } else if (lowerMsg.includes('特辣')) {
        this.context.addTastePreference(customerId, '特辣');
      }
    }
    if (lowerMsg.includes('不要辣') || lowerMsg.includes('不辣')) {
      this.context.addDislike(customerId, '辣');
    }

    return {
      type: 'text',
      reply: '好的，已记录您的口味要求~'
    };
  }

  /**
   * 确认下单
   */
  async handleConfirmOrder(sessionId, customerId) {
    const session = this.context.getOrCreateSession(sessionId);
    if (session.currentCart.length === 0) {
      return { type: 'text', reply: '购物车是空的哦，先选点菜吧~' };
    }

    const total = session.currentCart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    const orderNo = `YS${Date.now()}`;

    const syncResult = await this.tools.syncOrder({
      orderNo,
      items: session.currentCart,
      total
    });

    if (syncResult.success) {
      this.context.recordOrder(customerId, {
        orderNo,
        items: session.currentCart,
        total
      });
      this.context.clearCart(sessionId);

      return {
        type: 'order_confirmed',
        reply: `✅ 下单成功！\n\n订单号：${orderNo}\n金额：¥${total}\n\n感谢惠顾，请稍候~`,
        orderNo,
        total
      };
    }

    return {
      type: 'error',
      reply: '下单失败了，稍后再试可以吗？'
    };
  }

  /**
   * 查询菜单
   */
  async handleQueryMenu(sessionId) {
    if (!this.recommendationEngine) {
      const result = await this.tools.getDishes();
      if (!result.success) {
        return { type: 'text', reply: '抱歉，暂时无法获取菜单~' };
      }
      const menuText = result.dishes.slice(0, 6).map(d => `${d.name} - ¥${d.price}`).join('\n');
      return {
        type: 'menu',
        reply: `我们的菜品：\n\n${menuText}\n\n想点什么？`,
        dishes: result.dishes
      };
    }

    const session = this.context.getOrCreateSession(sessionId);
    const profile = this.context.getCustomerProfile(sessionId);
    const recommendations = await this.recommendationEngine.getComprehensiveRecommendation(profile, session.currentCart);

    let reply = '我们的招牌菜品：\n\n';
    if (recommendations.popular?.length > 0) {
      reply += '🔥 今日爆款：\n';
      recommendations.popular.slice(0, 3).forEach(dish => {
        reply += `  • ${dish.name} - ¥${dish.price}\n`;
      });
    }
    if (recommendations.combo?.length > 0) {
      reply += '\n🍱 超值套餐：\n';
      recommendations.combo.slice(0, 2).forEach(combo => {
        reply += `  • ${combo.name} - ¥${combo.comboPrice}（省${combo.discount}元）\n`;
      });
    }

    return {
      type: 'menu',
      reply
    };
  }

  /**
   * 重复上次订单
   */
  async handleRepeatOrder(sessionId, customerId) {
    const profile = this.context.getCustomerProfile(customerId);
    if (profile.orderHistory.length === 0) {
      return { type: 'text', reply: '抱歉，我找不到您的历史订单~' };
    }

    const lastOrder = profile.orderHistory[0];
    for (const item of lastOrder.items) {
      this.context.addToCart(sessionId, item);
    }

    const total = lastOrder.items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

    return {
      type: 'cart_updated',
      reply: `已复刻您上次的订单：\n\n${lastOrder.items.map(i => `${i.name} x${i.quantity || 1}`).join('\n')}\n\n总计：¥${total}\n\n确认下单吗？`,
      cart: this.context.getOrCreateSession(sessionId).currentCart
    };
  }

  /**
   * 欢迎消息
   */
  async handleWelcome(sessionId, customerId) {
    const profile = this.context.getCustomerProfile(customerId);
    const isReturning = profile.visitCount > 0;

    let welcome = '';
    if (isReturning) {
      welcome = `😊 欢迎回来！`;
      if (profile.preferences?.tastes?.length > 0) {
        welcome += `喜欢${profile.preferences.tastes.join('、')}的对吧~\n\n`;
      }
    } else {
      welcome = `👋 欢迎光临！\n\n`;
    }

    return {
      type: 'welcome',
      reply: welcome + '想吃点什么？我可以帮您推荐菜品，或者直接告诉我菜名~',
      isReturning
    };
  }
}

module.exports = MCPHandler;
