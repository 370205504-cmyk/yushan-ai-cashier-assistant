/**
 * 智能推荐引擎 v2.0
 * 结合历史销量、库存、顾客口味、当前活动，主动推荐菜品/套餐/凑单
 */

const SENSITIVE_KEYWORDS = [
  '色情', '暴力', '赌博', '毒品', '政治', '反动', '邪教',
  '诈骗', '违法', '违规', '色情服务', '性服务', '成人'
];

const VALID_CATEGORIES = ['主食', '菜品', '饮料', '甜点', '套餐', '小吃'];

class RecommendationEngine {
  constructor() {
    this.dishes = [];
    this.salesHistory = [];
    this.activePromotions = [];
  }

  containsSensitiveContent(text) {
    if (!text || typeof text !== 'string') {
      return false;
    }
    const lowerText = text.toLowerCase();
    return SENSITIVE_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
  }

  validateCustomerProfile(profile) {
    if (!profile || typeof profile !== 'object') {
      return { valid: false, message: '顾客信息必须是对象' };
    }

    if (profile.preferences) {
      if (typeof profile.preferences !== 'object') {
        return { valid: false, message: '偏好设置必须是对象' };
      }
      if (profile.preferences.tastes && !Array.isArray(profile.preferences.tastes)) {
        return { valid: false, message: '口味偏好必须是数组' };
      }
      if (profile.preferences.dislikes && !Array.isArray(profile.preferences.dislikes)) {
        return { valid: false, message: '忌口必须是数组' };
      }
    }

    if (profile.visitCount !== undefined && typeof profile.visitCount !== 'number') {
      return { valid: false, message: '访问次数必须是数字' };
    }

    return { valid: true };
  }

  filterSensitiveDishes(dishes) {
    return dishes.filter(dish => {
      const hasSensitive = this.containsSensitiveContent(dish.name) ||
                          this.containsSensitiveContent(dish.description) ||
                          (dish.tags && dish.tags.some(tag => this.containsSensitiveContent(tag)));
      if (hasSensitive) {
        console.warn(`过滤敏感菜品: ${dish.name}`);
      }
      return !hasSensitive;
    });
  }

  sanitizeRecommendationText(text) {
    if (!text || typeof text !== 'string') {
      return text;
    }
    let sanitized = text;
    SENSITIVE_KEYWORDS.forEach(keyword => {
      sanitized = sanitized.replace(new RegExp(keyword, 'gi'), '***');
    });
    return sanitized;
  }

  /**
   * 初始化推荐引擎
   */
  async init(adapter) {
    try {
      this.dishes = await adapter.getDishes() || [];
      const inventory = await adapter.getInventory() || [];
      
      // 合并库存信息到菜品
      this.dishes = this.dishes.map(dish => {
        const inv = inventory.find(i => i.dishId === dish.id || i.dishName === dish.name);
        return { ...dish, stock: inv?.stock || 999 };
      });

      // 过滤敏感内容
      const beforeCount = this.dishes.length;
      this.dishes = this.filterSensitiveDishes(this.dishes);
      if (beforeCount > this.dishes.length) {
        console.log(`⚠️ 过滤了 ${beforeCount - this.dishes.length} 个敏感菜品`);
      }

      // 获取今日销售数据（模拟）
      this.salesHistory = this.getMockSalesHistory();
      
      console.log(`✅ 推荐引擎初始化完成：${this.dishes.length} 个菜品`);
      return true;
    } catch (e) {
      console.error('推荐引擎初始化失败:', e);
      return false;
    }
  }

  /**
   * 模拟销售历史数据
   */
  getMockSalesHistory() {
    return [
      { dishName: '宫保鸡丁', count: 45, revenue: 1260, day: 'today' },
      { dishName: '鱼香肉丝', count: 38, revenue: 988, day: 'today' },
      { dishName: '麻婆豆腐', count: 32, revenue: 576, day: 'today' },
      { dishName: '红烧肉', count: 28, revenue: 896, day: 'today' },
      { dishName: '糖醋里脊', count: 25, revenue: 750, day: 'today' },
      { dishName: '宫保鸡丁', count: 42, revenue: 1176, day: 'yesterday' },
      { dishName: '鱼香肉丝', count: 35, revenue: 910, day: 'yesterday' },
    ];
  }

  /**
   * 获取综合推荐
   */
  async getComprehensiveRecommendation(customerProfile = {}, currentCart = []) {
    const recommendations = {
      popular: [],      // 爆款推荐
      personalized: [], // 个性化推荐
      combo: [],        // 套餐推荐
     凑单: [],          // 凑单推荐
      promotion: []     // 促销推荐
    };

    // 验证顾客信息
    const profileValidation = this.validateCustomerProfile(customerProfile);
    if (!profileValidation.valid) {
      console.warn(`顾客信息验证失败: ${profileValidation.message}`);
      return recommendations;
    }

    // 验证购物车数据
    if (!Array.isArray(currentCart)) {
      console.warn('购物车数据必须是数组');
      return recommendations;
    }

    // 1. 爆款推荐（基于历史销量）
    recommendations.popular = this.getPopularDishes(3);

    // 2. 个性化推荐（基于顾客口味）
    if (Object.keys(customerProfile).length > 0) {
      recommendations.personalized = this.getPersonalizedDishes(customerProfile, 3);
    }

    // 3. 套餐推荐
    recommendations.combo = this.getComboRecommendations(currentCart, 2);

    // 4. 凑单推荐（基于当前购物车）
    if (currentCart.length > 0) {
      recommendations.fillOrder = this.getFillOrderRecommendations(currentCart, 2);
    }

    // 5. 促销推荐
    recommendations.promotion = this.getPromotionRecommendations(2);

    // 过滤所有推荐中的敏感内容
    return this.filterRecommendations(recommendations);
  }

  filterRecommendations(recommendations) {
    const filtered = {};
    Object.keys(recommendations).forEach(key => {
      if (Array.isArray(recommendations[key])) {
        filtered[key] = recommendations[key].map(item => {
          if (item.name) {
            item.name = this.sanitizeRecommendationText(item.name);
          }
          if (item.reason) {
            item.reason = this.sanitizeRecommendationText(item.reason);
          }
          if (item.title) {
            item.title = this.sanitizeRecommendationText(item.title);
          }
          if (item.description) {
            item.description = this.sanitizeRecommendationText(item.description);
          }
          return item;
        });
      } else {
        filtered[key] = recommendations[key];
      }
    });
    return filtered;
  }

  /**
   * 获取爆款菜品
   */
  getPopularDishes(limit = 5) {
    const salesMap = {};
    
    this.salesHistory.forEach(sale => {
      if (!salesMap[sale.dishName]) {
        salesMap[sale.dishName] = { count: 0, revenue: 0 };
      }
      salesMap[sale.dishName].count += sale.count;
      salesMap[sale.dishName].revenue += sale.revenue;
    });

    const sorted = Object.entries(salesMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return sorted.map(item => {
      const dish = this.dishes.find(d => d.name === item.name);
      return dish ? {
        ...dish,
        salesCount: item.count,
        salesRevenue: item.revenue,
        reason: '今日爆款，卖得最好！'
      } : null;
    }).filter(Boolean);
  }

  /**
   * 获取个性化推荐
   */
  getPersonalizedDishes(customerProfile, limit = 3) {
    const recommendations = [];

    // 基于口味偏好推荐
    if (customerProfile.preferences?.tastes) {
      const tasteMatches = this.dishes.filter(dish => 
        customerProfile.preferences.tastes.some(taste => 
          dish.tags?.includes(taste) || dish.name.includes(taste)
        )
      );
      recommendations.push(...tasteMatches);
    }

    // 基于忌口排除
    const filtered = recommendations.filter(dish => 
      !customerProfile.preferences?.dislikes?.some(dislike => 
        dish.name.includes(dislike) || dish.tags?.includes(dislike)
      )
    );

    // 基于辣度偏好
    if (customerProfile.preferences?.spiceLevel) {
      const spiceFiltered = filtered.filter(dish => 
        dish.spiceLevel === customerProfile.preferences.spiceLevel || 
        !dish.spiceLevel
      );
      if (spiceFiltered.length > 0) {
        return spiceFiltered.slice(0, limit);
      }
    }

    return filtered.slice(0, limit).map(dish => ({
      ...dish,
      reason: '根据您的口味偏好推荐'
    }));
  }

  /**
   * 获取套餐推荐
   */
  getComboRecommendations(currentCart = [], limit = 2) {
    const cartTotal = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cartCategories = currentCart.map(item => item.category);

    // 寻找可以组合的套餐
    const combos = [
      {
        name: '2人经典套餐',
        items: ['宫保鸡丁', '鱼香肉丝', '米饭 x2', '紫菜蛋花汤'],
        originalPrice: 85,
        comboPrice: 68,
        discount: 17,
        reason: '2人用餐推荐，超值省17元'
      },
      {
        name: '3人豪华套餐',
        items: ['红烧肉', '麻婆豆腐', '糖醋里脊', '米饭 x3', '酸辣汤'],
        originalPrice: 128,
        comboPrice: 98,
        discount: 30,
        reason: '3人聚餐首选，省30元'
      },
      {
        name: '单人简餐',
        items: ['宫保鸡丁', '米饭', '饮料'],
        originalPrice: 38,
        comboPrice: 32,
        discount: 6,
        reason: '一个人也要吃好'
      }
    ];

    // 根据当前购物车情况推荐
    if (currentCart.length === 0) {
      return combos.slice(0, limit).map(combo => ({
        ...combo,
        reason: '刚进来？试试我们的超值套餐！'
      }));
    }

    return combos.slice(0, limit);
  }

  /**
   * 获取凑单推荐
   */
  getFillOrderRecommendations(currentCart = [], limit = 2) {
    const cartTotal = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const fillTargets = [
      { threshold: 50, recommend: '米饭', message: '再加一碗米饭就能凑满50元啦！' },
      { threshold: 100, recommend: '饮料', message: '再来一瓶饮料，满100减10！' },
      { threshold: 150, recommend: '糖醋里脊', message: '加一份糖醋里脊，满150减20！' },
    ];

    const recommendations = [];
    
    for (const target of fillTargets) {
      if (cartTotal < target.threshold && cartTotal > target.threshold - 30) {
        const dish = this.dishes.find(d => d.name.includes(target.recommend) || d.category === '主食' || d.category === '饮料');
        if (dish) {
          recommendations.push({
            ...dish,
            reason: target.message,
            toThreshold: target.threshold - cartTotal
          });
        }
      }
    }

    return recommendations.slice(0, limit);
  }

  /**
   * 获取促销推荐
   */
  getPromotionRecommendations(limit = 2) {
    const promotions = [
      {
        title: '新用户首单立减',
        description: '首次下单立减10元',
        code: 'NEW10',
        discount: 10,
        minAmount: 50
      },
      {
        title: '满100减15',
        description: '点餐满100元立减15元',
        code: 'MAN100',
        discount: 15,
        minAmount: 100
      },
      {
        title: '套餐8折',
        description: '所有套餐享受8折优惠',
        code: 'COMBO8',
        discount: '20%',
        minAmount: 0
      },
      {
        title: '会员日双倍积分',
        description: '每周三会员消费双倍积分',
        code: 'VIP2X',
        discount: '2X积分',
        minAmount: 0
      }
    ];

    return promotions.slice(0, limit).map(promo => ({
      ...promo,
      reason: '当前可用优惠'
    }));
  }

  /**
   * 智能推荐话术
   */
  getRecommendationMessage(recommendations, customerProfile = {}) {
    let message = '';

    // 验证顾客信息
    const profileValidation = this.validateCustomerProfile(customerProfile);
    if (!profileValidation.valid) {
      return '👋 欢迎光临！有什么我可以帮您点的？';
    }

    // 迎宾话术
    if (!customerProfile.visitCount || customerProfile.visitCount === 0) {
      message += '👋 欢迎光临！有什么我可以帮您点的？\n\n';
      if (recommendations.popular?.length > 0) {
        const dishName = this.sanitizeRecommendationText(recommendations.popular[0].name);
        message += `🔥 今日爆款「${dishName}」卖得特别好，要不要来一份？\n`;
      }
    } else {
      // 回头客
      const tastes = customerProfile.preferences?.tastes?.map(t => this.sanitizeRecommendationText(t)) || [];
      message += `😊 欢迎回来！${tastes.join('、') || ''}对吧？\n\n`;
      if (recommendations.personalized?.length > 0) {
        const dishName = this.sanitizeRecommendationText(recommendations.personalized[0].name);
        message += `✨ 根据您的口味，推荐「${dishName}」\n`;
      }
    }

    // 套餐推荐
    if (recommendations.combo?.length > 0) {
      const combo = recommendations.combo[0];
      const comboName = this.sanitizeRecommendationText(combo.name);
      message += `\n🍱 套餐推荐：「${comboName}」原价${combo.originalPrice}元，现在只要${combo.comboPrice}元！省${combo.discount}元！\n`;
    }

    // 凑单推荐
    if (recommendations.fillOrder?.length > 0) {
      const fillItem = recommendations.fillOrder[0];
      const dishName = this.sanitizeRecommendationText(fillItem.name);
      message += `\n💰 凑单提示：再来${fillItem.toThreshold.toFixed(0)}元就能享受满减优惠啦！「${dishName}」只要${fillItem.price}元~\n`;
    }

    // 促销推荐
    if (recommendations.promotion?.length > 0) {
      const promo = recommendations.promotion[0];
      const title = this.sanitizeRecommendationText(promo.title);
      message += `\n🎁 优惠提醒：${title}，满${promo.minAmount}元可用！\n`;
    }

    return this.sanitizeRecommendationText(message);
  }

  /**
   * 预估客单价提升
   */
  estimateUpsellPotential(currentCart = []) {
    const cartTotal = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const avgOrderValue = 65; // 假设平均客单价

    let potential = 0;
    let suggestions = [];

    // 检测是否可以推荐套餐
    if (cartTotal < avgOrderValue) {
      const diff = avgOrderValue - cartTotal;
      potential = (diff / avgOrderValue) * 100;
      suggestions.push({
        type: 'combo',
        message: `推荐套餐可提升客单价${diff.toFixed(0)}元`,
        potential: `${diff.toFixed(0)}元`
      });
    }

    // 检测是否可以凑单
    const fillTargetAmount = 100;
    if (cartTotal < fillTargetAmount && cartTotal > fillTargetAmount - 30) {
      const diff = fillTargetAmount - cartTotal;
      potential += 15; // 满减带来的额外价值
      suggestions.push({
        type: '凑单',
        message: `凑单到${凑单Target}元可减15元`,
        potential: `15元`
      });
    }

    return {
      currentAverage: avgOrderValue,
      currentCart: cartTotal,
      potentialIncrease: potential,
      suggestions
    };
  }
}

module.exports = RecommendationEngine;
