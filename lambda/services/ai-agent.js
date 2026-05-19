/**
 * AI主动技能 - 主动迎宾、主动推荐、主动提醒
 */

class AIAgent {
  constructor() {
    this.greetings = [
      '欢迎光临！今天想吃点什么？',
      '您好！我是您的AI点餐助手，有什么可以帮您？',
      '欢迎！需要我为您推荐招牌菜吗？'
    ];
    this.recommendations = [
      '今天的招牌菜「宫保鸡丁」卖得特别好，您要不要试试？',
      '现在是饭点，推荐您尝尝我们的「鱼香肉丝」套餐！',
      '今天有新品上市「麻婆豆腐」，要不要尝一下？'
    ];
  }

  /**
   * 主动迎宾
   */
  getWelcomeMessage(customerInfo = {}) {
    const greeting = this.greetings[Math.floor(Math.random() * this.greetings.length)];
    
    if (customerInfo.isReturning) {
      return `欢迎回来！${greeting}`;
    }
    
    return greeting;
  }

  /**
   * 主动推荐
   */
  getRecommendation(customerProfile = {}) {
    const recommendation = this.recommendations[Math.floor(Math.random() * this.recommendations.length)];
    return recommendation;
  }

  /**
   * 主动提醒忌口
   */
  getDietaryReminder(customerProfile) {
    const reminders = [];
    if (customerProfile?.preferences?.dislikes?.length > 0) {
      const dislikes = customerProfile.preferences.dislikes.join('、');
      reminders.push(`我记得您不吃${dislikes}，我会帮您注意的！`);
    }
    if (customerProfile?.preferences?.tastes?.length > 0) {
      const tastes = customerProfile.preferences.tastes.join('、');
      reminders.push(`我记得您喜欢${tastes}！`);
    }
    return reminders;
  }

  /**
   * 订单状态主动推送
   */
  getOrderStatusUpdate(orderStatus) {
    const statusMessages = {
      'CONFIRMED': '您的订单已确认，厨房正在准备中...',
      'COOKING': '您的菜正在烹饪中，请稍候！',
      'READY': '您的餐准备好了！请到前台取餐！',
      'COMPLETED': '您的订单已完成，感谢您的惠顾！'
    };
    return statusMessages[orderStatus] || '您的订单正在处理中';
  }

  /**
   * 根据时间场景化推荐
   */
  getTimeBasedRecommendation() {
    const hour = new Date().getHours();
    if (hour >= 7 && hour < 10) {
      return '现在是早餐时间，推荐试试我们的豆浆油条套餐！';
    } else if (hour >= 11 && hour < 14) {
      return '现在是午餐高峰，推荐您点我们的招牌套餐！';
    } else if (hour >= 17 && hour < 21) {
      return '晚餐时间到！可以试试我们的特色菜！';
    }
    return '来份小吃或饮品放松一下吧！';
  }
}

module.exports = AIAgent;
