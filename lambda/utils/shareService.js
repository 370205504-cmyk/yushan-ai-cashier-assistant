class ShareService {
  constructor() {
    this.baseUrl = 'https://yushan-ai-cashier.example.com/share';
  }

  /**
   * 生成分享内容
   * @param {Object} dish - 菜品对象
   * @param {string} platform - 分享平台
   * @returns {Object} 分享内容
   */
  generateShareContent(dish, platform) {
    const commonContent = {
      title: `🍳 今天给自己做了一道 ${dish.name}！`,
      description: `分享一道超级好吃的${dish.cuisine}——${dish.name}，${dish.taste}的口味，难度${dish.difficulty}，在家也能做出餐厅的味道！`,
      image: dish.imageUrl || `${this.baseUrl}/images/${dish.id}.jpg`
    };

    switch (platform) {
      case 'xiaohongshu':
        return this.generateXiaohongshuContent(dish, commonContent);
      case 'wechat':
        return this.generateWechatContent(dish, commonContent);
      case 'weibo':
        return this.generateWeiboContent(dish, commonContent);
      default:
        return commonContent;
    }
  }

  /**
   * 生成小红书分享内容
   * @param {Object} dish - 菜品对象
   * @param {Object} commonContent - 通用内容
   * @returns {Object} 小红书内容
   */
  generateXiaohongshuContent(dish, commonContent) {
    return {
      title: commonContent.title,
      content: `${commonContent.description}

📝 所需食材：
${dish.ingredients.map(i => `• ${i}`).join('\n')}

⏱️ 难度：${dish.difficulty} ⭐
⏰ 耗时：${dish.cookingTime}
🔥 热量：约${dish.calories}kcal

跟着做起来，保证不翻车！💪

#${dish.cuisine} #家常菜 #下厨房 #美食分享 #今天吃什么 #烹饪教程`,
      hashtags: [
        `#${dish.cuisine}`,
        '#家常菜',
        '#下厨房',
        '#美食分享',
        '#今天吃什么',
        '#烹饪教程',
        '#雨姗AI收银助手创味菜'
      ],
      image: commonContent.image
    };
  }

  /**
   * 生成微信分享内容
   * @param {Object} dish - 菜品对象
   * @param {Object} commonContent - 通用内容
   * @returns {Object} 微信内容
   */
  generateWechatContent(dish, commonContent) {
    return {
      title: commonContent.title,
      summary: commonContent.description,
      description: `${dish.name}

菜系：${dish.cuisine}
口味：${dish.taste}
难度：${dish.difficulty}
耗时：${dish.cookingTime}

${dish.ingredients.slice(0, 5).join('、')}...`,
      image: commonContent.image
    };
  }

  /**
   * 生成微博分享内容
   * @param {Object} dish - 菜品对象
   * @param {Object} commonContent - 通用内容
   * @returns {Object} 微博内容
   */
  generateWeiboContent(dish, commonContent) {
    return {
      title: commonContent.title,
      content: `${commonContent.description} ${dish.ingredients.slice(0, 3).join('、')}... @雨姗AI收银助手创味菜`,
      hashtags: [
        `#${dish.cuisine}`,
        '#美食',
        '#烹饪',
        '#下厨房',
        '雨姗AI收银助手创味菜'
      ],
      image: commonContent.image
    };
  }

  /**
   * 生成分享链接
   * @param {string} platform - 分享平台
   * @param {string} dishId - 菜品ID
   * @returns {string} 分享链接
   */
  generateShareLink(platform, dishId) {
    const encodedDishId = encodeURIComponent(dishId);

    switch (platform) {
      case 'xiaohongshu':
        return `https://www.xiaohongshu.com/discovery/item/${encodedDishId}?channel=alexa`;
      case 'wechat':
        return `${this.baseUrl}/wxapp?dishId=${encodedDishId}`;
      case 'weibo':
        return `https://weibo.com/detail/${encodedDishId}`;
      default:
        return `${this.baseUrl}/share?dishId=${encodedDishId}`;
    }
  }

  /**
   * 生成微信小程序分享卡片
   * @param {Object} dish - 菜品对象
   * @returns {Object} 小程序分享数据
   */
  generateMiniProgramCard(dish) {
    return {
      title: dish.name,
      description: dish.taste,
      imageUrl: dish.imageUrl,
      path: `/pages/dish/detail?dishId=${dish.id}`,
      userName: 'gh_xxxxxxxx' // 小程序原始ID
    };
  }

  /**
   * 生成分享图片
   * @param {Object} dish - 菜品对象
   * @returns {string} 图片URL
   */
  generateShareImage(dish) {
    return `${this.baseUrl}/images/share/${dish.id}_${Date.now()}.jpg`;
  }
}

module.exports = ShareService;
