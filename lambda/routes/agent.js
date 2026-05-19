const cartService = require('../services/cartService');
const contextManager = require('../session/contextManager');
const dishesService = require('../services/dishesService');
const orderService = require('../services/orderServiceV2');
const inputValidator = require('../services/inputValidator');
const logger = require('../utils/logger');
const storeService = require('../services/storeService');
const llmService = require('../services/llm-service');
const weatherService = require('../services/weatherService');

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(previous|all|your|above)/i,
  /forget\s+(everything|instructions|above)/i,
  /disregard\s+(your|previous|above)/i,
  /you\s+are\s+now/i,
  /you\s+are\s+a/i,
  /pretend\s+you\s+are/i,
  /act\s+as/i,
  /let's\s+role\s+play/i,
  /roleplay/i,
  /system\s+prompt/i,
  /reveal\s+(your|the)\s+prompt/i,
  /show\s+(your|the)\s+prompt/i,
  /tell\s+(me|us)\s+your\s+prompt/i,
  /what\s+is\s+your\s+prompt/i,
  /bypass\s+security/i,
  /disable\s+security/i,
  /sql\s+(select|insert|update|delete|drop|truncate|union)/i,
  /select\s+.*\s+from/i,
  /delete\s+from/i,
  /drop\s+(table|database)/i,
  /\bexec\b|\beval\b|\beval\s*\(/i,
  /\{\{.*\}\}/,
  /\${.*}/,
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /忽略之前/i,
  /忘记一切/i,
  /无视你的/i,
  /你现在是/i,
  /扮演/i,
  /假装/i,
  /角色替换/i,
  /揭示你的/i,
  /显示你的/i,
  /告诉我你的/i,
  /你的提示词/i,
  /绕过安全/i
];

const SUSPICIOUS_KEYWORDS = ['system', 'prompt', 'ignore', 'forget', 'disregard', 'bypass', 'disable', 'reveal', 'show', 'tell'];

function detectPromptInjection(query) {
  const lowerQuery = query.toLowerCase().trim();
  
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(query)) {
      return true;
    }
  }
  
  const words = lowerQuery.split(/\s+/);
  const hasSuspicious = SUSPICIOUS_KEYWORDS.some(keyword => 
    words.slice(0, Math.min(10, words.length)).includes(keyword)
  );
  
  if (hasSuspicious && words.length <= 5) {
    return true;
  }
  
  return false;
}

async function agentAdapter(req, res, next) {
  try {
    const { query, user_id, session_id, context = {} } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'INVALID_QUERY',
        message: '缺少必要参数：query'
      });
    }

    if (detectPromptInjection(query)) {
      logger.warn('Prompt注入攻击检测', { query: query.substring(0, 100) });
      return res.status(400).json({
        success: false,
        code: 'INVALID_INPUT',
        message: '输入内容包含无效指令'
      });
    }

    const safeQuery = inputValidator.validateSearchQuery(query);
    if (!safeQuery) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_QUERY',
        message: '查询内容无效'
      });
    }

    const userId = user_id ? inputValidator.validateUserId(user_id) : null;
    const sessionId = session_id || `session-${Date.now()}`;

    logger.info('Agent请求', { userId, sessionId, query: safeQuery });

    const userContext = contextManager.getContext(userId || sessionId);
    const result = await processAgentQuery(safeQuery, userId, sessionId, userContext);

    contextManager.updateContext(userId || sessionId, result.context);

    res.json({
      success: true,
      reply: result.response,
      actions: result.actions || [],
      data: result.data || {},
      sessionId: sessionId,
      requiresConfirmation: result.requiresConfirmation || false,
      clarification: result.clarification || null
    });
  } catch (error) {
    logger.error('Agent处理失败', { error: error.message });
    next(error);
  }
}

async function processAgentQuery(query, userId, sessionId, context) {
  context = context || {};
  context.lastQuery = query;

  try {
    const dishes = await dishesService.getAllDishes();
    const cart = await cartService.getCart(userId);

    const userPreferences = await getUserPreferences(userId);

    return await handleLLMQuery(query, userId, context, dishes, cart, userPreferences);
  } catch (error) {
    logger.error('回复处理失败', { error: error.message });
    return getSmartFallbackResponse(query, context);
  }
}

async function getUserPreferences(userId) {
  try {
    const preferences = contextManager.getContext(userId);
    return {
      favoriteDishes: preferences?.favoriteDishes || [],
      dietaryRestrictions: preferences?.dietaryRestrictions || [],
      usualOrder: preferences?.usualOrder || [],
      visitCount: preferences?.visitCount || 0
    };
  } catch {
    return {
      favoriteDishes: [],
      dietaryRestrictions: [],
      usualOrder: [],
      visitCount: 0
    };
  }
}

function getSmartFallbackResponse(query, context) {
  const fallbackResponses = [
    `关于"${query}"这个问题，我还在学习中呢~ 不过我可以帮您点餐、查询门店信息或推荐菜品，您需要什么帮助？😊`,
    `这个问题我暂时还不太明白呢~ 您可以试试说"推荐招牌菜"、"看看菜单"或者"WiFi密码"，我来帮您！`,
    `哇，这个问题很有意思！不过现在我主要负责点餐服务，您想吃点什么呢？`,
    `抱歉，这个问题我还答不上来~ 但我可以帮您点餐哦！需要看看菜单吗？`,
    `这个话题有点超出我的能力范围呢~ 让我们聊点餐吧！想吃点什么？🍽️`
  ];

  return {
    response: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
    actions: [],
    data: {},
    context: context
  };
}

async function handleLLMQuery(query, userId, context, dishes, cart, preferences) {
  try {
    const conversationHistory = contextManager.getConversationHistory(userId) || [];
    
    const menuCategories = [...new Set(dishes.map(d => d.category))];
    const featuredDishes = dishes.filter(d => d.isRecommend || d.isSignature).slice(0, 5);
    const cartSummary = cart.items?.length > 0 
      ? `购物车有${cart.items.length}件商品，合计¥${cart.total}` 
      : '购物车为空';

    const userInfo = preferences.visitCount > 0 
      ? `这是您第${preferences.visitCount}次光临` 
      : '这是您第一次光临';

    const systemPrompt = `你是雨姗餐厅的智能助手，友好、聪明、专业。

餐厅信息：
- 餐厅名称：雨姗餐厅
- 地址：河南省商丘市睢阳区
- 营业时间：每天09:00-22:00
- WiFi密码：88888888
- 招牌菜：${featuredDishes.map(d => d.name).join('、')}

你的主要职责：
1. 帮助顾客点餐、推荐美食
2. 回答餐厅相关问题（WiFi、地址、营业时间）
3. 如果顾客问其他问题，也要认真回答

回答要求：
- 简洁明了，不要啰嗦
- 语气友好，像朋友聊天
- 不要讲奇怪的故事，直接回答问题
- 如果你确实不知道，就说"这个问题我不太清楚呢"`;

    const llmMessages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: query }
    ];

    logger.info('调用LLM服务', { query: query.substring(0, 50), provider: process.env.LLM_PROVIDER });

    const result = await llmService.chat({
      messages: llmMessages,
      systemPrompt: null
    });

    logger.info('LLM返回结果', { success: result.success, replyLength: result.reply?.length });

    if (result.success && result.reply && result.reply.trim()) {
      contextManager.addMessage(userId, 'user', query);
      contextManager.addMessage(userId, 'assistant', result.reply);

      await updateUserPreferences(userId, query, dishes);

      return {
        response: result.reply,
        actions: await extractActions(result.reply, userId, dishes),
        data: {},
        context: { ...context, lastIntent: 'llm' }
      };
    }

    return getSmartFallbackResponse(query, context);
  } catch (error) {
    logger.error('LLM查询失败', { error: error.message, userId });
    return getSmartFallbackResponse(query, context);
  }
}

async function updateUserPreferences(userId, query, dishes) {
  try {
    const context = contextManager.getContext(userId);
    const lowerQuery = query.toLowerCase();

    for (const dish of dishes) {
      if (lowerQuery.includes(dish.name.toLowerCase()) && lowerQuery.match(/(来|点|要|喜欢|想吃)/)) {
        if (!context.favoriteDishes) context.favoriteDishes = [];
        if (!context.favoriteDishes.includes(dish.name)) {
          context.favoriteDishes.push(dish.name);
        }
        if (!context.usualOrder) context.usualOrder = [];
        context.usualOrder.push(dish.name);
        break;
      }
    }

    if (lowerQuery.includes('不吃') || lowerQuery.includes('忌口') || lowerQuery.includes('过敏')) {
      if (!context.dietaryRestrictions) context.dietaryRestrictions = [];
      const restrictions = ['辣', '海鲜', '牛肉', '猪肉', '鸡蛋', '牛奶'];
      for (const r of restrictions) {
        if (lowerQuery.includes(r)) {
          if (!context.dietaryRestrictions.includes(r)) {
            context.dietaryRestrictions.push(r);
          }
        }
      }
    }

    context.visitCount = (context.visitCount || 0) + 1;
    context.lastVisit = Date.now();

    contextManager.updateContext(userId, context);
  } catch (error) {
    logger.error('更新用户偏好失败', { error: error.message });
  }
}

async function extractActions(reply, userId, dishes) {
  const actions = [];
  const lowerReply = reply.toLowerCase();

  const orderPatterns = [
    /来(一)?[两]?(份|个)(.+)/,
    /点(一)?[两]?(份|个)(.+)/,
    /要(一)?[两]?(份|个)(.+)/,
    /加(一)?[两]?(份|个)(.+)/
  ];

  for (const pattern of orderPatterns) {
    const match = reply.match(pattern);
    if (match && match[3]) {
      const dishName = match[3].trim().replace(/[吧呢好吗呀]/g, '').trim();
      if (dishName.length > 0) {
        const foundDish = dishes.find(d => 
          d.name.includes(dishName) || dishName.includes(d.name.replace(/[菜肉的]/g, ''))
        );
        if (foundDish) {
          await require('../services/cartService').addItem(userId, foundDish.id, 1, '');
          actions.push({ type: 'add_to_cart', data: { dish: foundDish, quantity: 1 } });
        }
      }
    }
  }

  if (lowerReply.includes('下单') || lowerReply.includes('结账') || lowerReply.includes('买单')) {
    actions.push({ type: 'checkout' });
  }

  if (lowerReply.includes('购物车')) {
    actions.push({ type: 'show_cart' });
  }

  return actions;
}

module.exports = agentAdapter;
