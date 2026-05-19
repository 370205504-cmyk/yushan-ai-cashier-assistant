class ContextManager {
  constructor() {
    this.contexts = new Map();
    this.CONTEXT_TIMEOUT = 30 * 60 * 1000;
  }

  getContext(userId) {
    const context = this.contexts.get(userId);
    if (context && Date.now() - context.lastActive < this.CONTEXT_TIMEOUT) {
      return context;
    }
    return this.createContext(userId);
  }

  createContext(userId) {
    const context = {
      userId,
      createdAt: new Date(),
      lastActive: Date.now(),
      conversationHistory: [],
      cart: {
        items: [],
        total: 0
      },
      preferences: {
        taste: [],
        budget: 'medium'
      },
      lastOrder: null
    };
    this.contexts.set(userId, context);
    return context;
  }

  updateContext(userId, updates) {
    const context = this.getContext(userId);
    Object.assign(context, updates);
    context.lastActive = Date.now();
    return context;
  }

  addToHistory(userId, role, content) {
    const context = this.getContext(userId);
    context.conversationHistory.push({
      role,
      content,
      timestamp: new Date()
    });
    context.lastActive = Date.now();

    if (context.conversationHistory.length > 50) {
      context.conversationHistory = context.conversationHistory.slice(-50);
    }
  }

  getConversationHistory(userId) {
    const context = this.getContext(userId);
    return context.conversationHistory || [];
  }

  addMessage(userId, role, content) {
    this.addToHistory(userId, role, content);
  }

  getLastIntent(userId) {
    const context = this.getContext(userId);
    const history = context.conversationHistory;

    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].intent) {
        return history[i].intent;
      }
    }
    return null;
  }

  setLastIntent(userId, intent) {
    const context = this.getContext(userId);
    const lastMessage = context.conversationHistory[context.conversationHistory.length - 1];
    if (lastMessage) {
      lastMessage.intent = intent;
    }
  }

  clearContext(userId) {
    this.contexts.delete(userId);
  }

  cleanupExpiredContexts() {
    const now = Date.now();
    for (const [userId, context] of this.contexts.entries()) {
      if (now - context.lastActive > this.CONTEXT_TIMEOUT) {
        this.contexts.delete(userId);
      }
    }
  }
}

setInterval(() => {
  require('./contextManager').cleanupExpiredContexts();
}, 60 * 60 * 1000);

module.exports = new ContextManager();
