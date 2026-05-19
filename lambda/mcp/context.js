/**
 * 上下文记忆增强 - 记住顾客口味、历史订单、会话状态
 */

class ContextManager {
  constructor() {
    this.sessions = new Map();
    this.customerProfiles = new Map();
  }

  /**
   * 获取或创建会话
   */
  getOrCreateSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        id: sessionId,
        createdAt: new Date().toISOString(),
        messages: [],
        currentCart: [],
        intent: null,
        lastOrder: null,
        state: 'INITIAL'
      });
    }
    return this.sessions.get(sessionId);
  }

  /**
   * 获取顾客画像
   */
  getCustomerProfile(customerId) {
    if (!this.customerProfiles.has(customerId)) {
      this.customerProfiles.set(customerId, {
        id: customerId,
        preferences: {
          tastes: [],
          dislikes: [],
          spiceLevel: null,
          dietaryRestrictions: []
        },
        orderHistory: [],
        visitCount: 0,
        totalSpent: 0
      });
    }
    return this.customerProfiles.get(customerId);
  }

  /**
   * 更新会话状态
   */
  updateSession(sessionId, updates) {
    const session = this.getOrCreateSession(sessionId);
    Object.assign(session, updates);
    session.updatedAt = new Date().toISOString();
    return session;
  }

  /**
   * 添加消息到会话历史
   */
  addMessage(sessionId, role, content) {
    const session = this.getOrCreateSession(sessionId);
    session.messages.push({
      role,
      content,
      timestamp: new Date().toISOString()
    });
    return session;
  }

  /**
   * 添加商品到购物车
   */
  addToCart(sessionId, item) {
    const session = this.getOrCreateSession(sessionId);
    const existing = session.currentCart.find(i => i.dishId === item.dishId);
    if (existing) {
      existing.quantity += item.quantity || 1;
    } else {
      session.currentCart.push({ ...item, quantity: item.quantity || 1 });
    }
    return session.currentCart;
  }

  /**
   * 从购物车移除商品
   */
  removeFromCart(sessionId, dishId) {
    const session = this.getOrCreateSession(sessionId);
    session.currentCart = session.currentCart.filter(i => i.dishId !== dishId);
    return session.currentCart;
  }

  /**
   * 清空购物车
   */
  clearCart(sessionId) {
    const session = this.getOrCreateSession(sessionId);
    session.currentCart = [];
    return session;
  }

  /**
   * 记录顾客口味偏好
   */
  addTastePreference(customerId, taste) {
    const profile = this.getCustomerProfile(customerId);
    if (!profile.preferences.tastes.includes(taste)) {
      profile.preferences.tastes.push(taste);
    }
  }

  /**
   * 记录忌口
   */
  addDislike(customerId, dislike) {
    const profile = this.getCustomerProfile(customerId);
    if (!profile.preferences.dislikes.includes(dislike)) {
      profile.preferences.dislikes.push(dislike);
    }
  }

  /**
   * 记录历史订单
   */
  recordOrder(customerId, order) {
    const profile = this.getCustomerProfile(customerId);
    profile.orderHistory.unshift({
      ...order,
      timestamp: new Date().toISOString()
    });
    profile.visitCount++;
    profile.totalSpent += order.total || 0;
  }

  /**
   * 获取会话上下文提示词
   */
  getContextPrompt(sessionId, customerId = null) {
    const session = this.getOrCreateSession(sessionId);
    let prompt = '';

    if (customerId) {
      const profile = this.getCustomerProfile(customerId);
      if (profile.preferences.tastes.length > 0) {
        prompt += `顾客喜欢: ${profile.preferences.tastes.join(', ')}\n`;
      }
      if (profile.preferences.dislikes.length > 0) {
        prompt += `顾客忌口: ${profile.preferences.dislikes.join(', ')}\n`;
      }
      if (profile.orderHistory.length > 0) {
        const lastOrder = profile.orderHistory[0];
        prompt += `上次点餐: ${lastOrder.items?.map(i => i.name).join(', ') || ''}\n`;
      }
    }

    if (session.currentCart.length > 0) {
      const cartItems = session.currentCart.map(i => `${i.name} x${i.quantity}`).join(', ');
      prompt += `当前购物车: ${cartItems}\n`;
    }

    if (session.messages.length > 0) {
      prompt += '最近对话:\n';
      session.messages.slice(-6).forEach(m => {
        prompt += `${m.role === 'user' ? '顾客' : 'AI'}: ${m.content}\n`;
      });
    }

    return prompt;
  }

  /**
   * 清理过期会话（24小时前）
   */
  cleanupExpiredSessions() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    for (const [id, session] of this.sessions.entries()) {
      if (new Date(session.createdAt) < cutoff) {
        this.sessions.delete(id);
      }
    }
  }
}

module.exports = ContextManager;
