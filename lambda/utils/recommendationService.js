class RecommendationService {
  constructor(dishes, customerProfiles = []) {
    this.dishes = dishes;
    this.customerProfiles = customerProfiles;
    this.tastePreferences = {
      '辣': ['spicy', 'mild_spicy', 'hot'],
      '麻': ['numbing_spicy', 'spicy'],
      '清淡': ['light', 'mild', 'plain'],
      '酸甜': ['sweet_sour', 'sour'],
      '咸鲜': ['savory', 'salty'],
      '香甜': ['sweet', 'fragrant']
    };

    this.scenarioMappings = {
      '儿童': ['forKids', 'light', 'non_spicy'],
      '老人': ['light', 'soft'],
      '素食': ['vegetarian', 'vegetable'],
      '减肥': ['low_calorie', 'vegetable', 'light'],
      '商务': ['signature', 'formal'],
      '聚会': ['signature', 'popular'],
      '约会': ['romantic', 'delicate'],
      '家常': ['home_style', 'comfort']
    };

    this.initializeCombos();
  }

  initializeCombos() {
    this.combos = [
      {
        id: 'combo_001',
        name: '单人经典套餐',
        dishes: ['宫保鸡丁', '米饭', '例汤'],
        price: 48,
        originalPrice: 58,
        forPeople: '1人',
        tags: ['招牌', '热门'],
        isCombo: true,
        description: '经典川菜搭配，营养均衡'
      },
      {
        id: 'combo_002',
        name: '双人甜蜜套餐',
        dishes: ['番茄炒蛋', '红烧肉', '清蒸鲈鱼', '米饭x2', '果汁x2'],
        price: 128,
        originalPrice: 158,
        forPeople: '2人',
        tags: ['热门', '约会'],
        isCombo: true,
        description: '荤素搭配，甜蜜分享'
      },
      {
        id: 'combo_003',
        name: '家庭欢乐套餐',
        dishes: ['宫保鸡丁', '麻婆豆腐', '水煮鱼', '糖醋排骨', '番茄炒蛋', '米饭x4', '饮料x4'],
        price: 268,
        originalPrice: 318,
        forPeople: '3-4人',
        tags: ['家庭', '聚会'],
        isCombo: true,
        description: '全家共享，丰富多样'
      },
      {
        id: 'combo_004',
        name: '儿童营养套餐',
        dishes: ['番茄炒蛋', '蛋炒饭', '玉米排骨汤', '果汁'],
        price: 38,
        originalPrice: 48,
        forPeople: '1人',
        tags: ['儿童', '健康'],
        isCombo: true,
        forKids: true,
        description: '专为小朋友设计，营养美味'
      },
      {
        id: 'combo_005',
        name: '商务宴请套餐',
        dishes: ['清蒸鲈鱼', '红烧肉', '三杯鸡', '小炒肉', '时蔬', '米饭x6', '茶水'],
        price: 398,
        originalPrice: 488,
        forPeople: '5-6人',
        tags: ['商务', '高端'],
        isCombo: true,
        description: '商务接待首选，体面大方'
      }
    ];
  }

  getCustomerProfile(customerId) {
    let profile = this.customerProfiles.find(p => p.customerId === customerId);

    if (!profile) {
      profile = {
        customerId: customerId,
        favoriteCuisines: [],
        favoriteTastes: [],
        favoriteDishes: [],
        dietaryRestrictions: [],
        allergies: [],
        orderHistory: [],
        lastVisit: null
      };
    }

    return profile;
  }

  updateCustomerPreference(customerId, preference) {
    const profile = this.getCustomerProfile(customerId);

    if (this.tastePreferences[preference]) {
      if (!profile.favoriteTastes.includes(preference)) {
        profile.favoriteTastes.push(preference);
      }
    }

    const scenarioTags = this.scenarioMappings[preference];
    if (scenarioTags) {
      profile.scenario = preference;
    }

    return profile;
  }

  addToOrderHistory(customerId, dishName, rating = null) {
    const profile = this.getCustomerProfile(customerId);

    profile.orderHistory.push({
      dishName: dishName,
      timestamp: new Date().toISOString(),
      rating: rating
    });

    if (rating && rating >= 4) {
      if (!profile.favoriteDishes.includes(dishName)) {
        profile.favoriteDishes.push(dishName);
      }
    }

    profile.lastVisit = new Date().toISOString();

    return profile;
  }

  recommendByPreference(preference, customerProfile = null) {
    let filteredDishes = [...this.dishes];
    const recommendations = [];

    if (this.tastePreferences[preference]) {
      const tasteTypes = this.tastePreferences[preference];
      filteredDishes = filteredDishes.filter(d =>
        tasteTypes.some(t => d.taste.includes(t))
      );
    }

    const scenarioTags = this.scenarioMappings[preference];
    if (scenarioTags) {
      filteredDishes = filteredDishes.filter(d =>
        scenarioTags.some(tag => {
          if (tag === 'forKids') {
            return d.forKids;
          }
          if (tag === 'vegetarian') {
            return d.isVegetarian;
          }
          if (tag === 'signature') {
            return d.isSignature;
          }
          if (tag === 'popular') {
            return d.popularity > 80;
          }
          return false;
        })
      );
    }

    if (customerProfile && customerProfile.favoriteCuisines.length > 0) {
      filteredDishes.sort((a, b) => {
        const aMatch = customerProfile.favoriteCuisines.includes(a.cuisine) ? 1 : 0;
        const bMatch = customerProfile.favoriteCuisines.includes(b.cuisine) ? 1 : 0;
        return bMatch - aMatch;
      });
    }

    filteredDishes.forEach(dish => {
      dish.matchScore = this.calculateMatchScore(dish, preference, customerProfile);
    });

    filteredDishes.sort((a, b) => b.matchScore - a.matchScore);

    return filteredDishes.slice(0, 5);
  }

  recommendByHistory(historyDishName, customerProfile = null) {
    const historyDish = this.dishes.find(d =>
      d.name.toLowerCase().includes(historyDishName.toLowerCase())
    );

    if (!historyDish) {
      return [];
    }

    return this.dishes.filter(d => {
      if (d.id === historyDish.id) {
        return false;
      }

      const sameCuisine = d.cuisine === historyDish.cuisine;
      const similarTaste = Math.abs(
        this.getTasteScore(d.taste) - this.getTasteScore(historyDish.taste)
      ) < 2;
      const similarIngredients = d.ingredients.some(i =>
        historyDish.ingredients.some(hi => i.includes(hi) || hi.includes(i))
      );

      return sameCuisine || similarTaste || similarIngredients;
    }).slice(0, 5);
  }

  getComprehensiveRecommendation(customerProfile = null) {
    let recommendedDishes = [...this.dishes];

    if (customerProfile && customerProfile.favoriteTastes.length > 0) {
      const topTaste = customerProfile.favoriteTastes[customerProfile.favoriteTastes.length - 1];
      recommendedDishes = this.recommendByPreference(topTaste, customerProfile);
    }

    if (recommendedDishes.length < 3) {
      recommendedDishes = [...this.dishes];
      recommendedDishes.sort((a, b) => (b.popularity || 80) - (a.popularity || 80));
    }

    return recommendedDishes.slice(0, 5);
  }

  calculateMatchScore(dish, preference, customerProfile) {
    let score = 50;

    if (this.tastePreferences[preference]) {
      const tasteTypes = this.tastePreferences[preference];
      if (tasteTypes.some(t => dish.taste.includes(t))) {
        score += 30;
      }
    }

    const scenarioTags = this.scenarioMappings[preference];
    if (scenarioTags) {
      if (scenarioTags.includes('forKids') && dish.forKids) {
        score += 20;
      }
      if (scenarioTags.includes('signature') && dish.isSignature) {
        score += 15;
      }
      if (scenarioTags.includes('vegetarian') && dish.isVegetarian) {
        score += 20;
      }
    }

    if (customerProfile) {
      if (customerProfile.favoriteCuisines.includes(dish.cuisine)) {
        score += 20;
      }
      if (customerProfile.favoriteDishes.includes(dish.name)) {
        score += 25;
      }
    }

    score += (dish.popularity || 80) * 0.2;

    return score;
  }

  getTasteScore(taste) {
    const tasteOrder = ['清淡', '咸鲜', '酸甜', '香甜', '微辣', '香辣', '麻辣'];
    return tasteOrder.indexOf(taste);
  }

  getCombos(comboType = null) {
    if (!comboType) {
      return this.combos;
    }

    return this.combos.filter(combo => {
      if (comboType.includes('单人')) {
        return combo.forPeople.includes('1人');
      } else if (comboType.includes('双人')) {
        return combo.forPeople.includes('2人');
      } else if (comboType.includes('家庭')) {
        return combo.forPeople.includes('3') || combo.forPeople.includes('4');
      } else if (comboType.includes('儿童')) {
        return combo.forKids;
      } else if (comboType.includes('商务')) {
        return combo.tags.includes('商务');
      }
      return true;
    });
  }

  generateMenuForPeople(personCount, mealType = 'all') {
    const menu = {
      breakfast: [],
      lunch: [],
      dinner: [],
      totalPrice: 0
    };

    const getDishesForMeal = (type, count) => {
      const suitableDishes = this.dishes.filter(d => {
        if (type === 'breakfast') {
          return d.calories < 300;
        }
        if (type === 'dinner') {
          return d.calories < 400;
        }
        return true;
      });

      const selectedCount = Math.min(Math.ceil(count / 2) + 1, 3);
      const selected = [];

      while (selected.length < selectedCount && suitableDishes.length > 0) {
        const randomIndex = Math.floor(Math.random() * suitableDishes.length);
        const dish = suitableDishes.splice(randomIndex, 1)[0];
        selected.push(dish);
        menu.totalPrice += dish.price;
      }

      return selected;
    };

    if (mealType === 'breakfast' || mealType === 'all') {
      menu.breakfast = getDishesForMeal('breakfast', personCount);
    }
    if (mealType === 'lunch' || mealType === 'all') {
      menu.lunch = getDishesForMeal('lunch', personCount);
    }
    if (mealType === 'dinner' || mealType === 'all') {
      menu.dinner = getDishesForMeal('dinner', personCount);
    }

    return menu;
  }

  getRecommendationReason(dish, preference) {
    const reasons = [];

    if (preference === '辣' && dish.taste.includes('辣')) {
      reasons.push('口味符合您喜欢的辣味');
    }
    if (preference === '清淡' && dish.taste === '清淡') {
      reasons.push('符合您偏好的清淡口味');
    }
    if (dish.isSignature) {
      reasons.push('这是本店招牌菜');
    }
    if (dish.forKids) {
      reasons.push('非常适合小朋友');
    }
    if (dish.isVegetarian) {
      reasons.push('素食友好');
    }
    if (dish.calories < 300) {
      reasons.push('热量较低，适合控制饮食');
    }

    return reasons.length > 0 ? reasons.join('；') : '精选推荐';
  }
}

module.exports = RecommendationService;
