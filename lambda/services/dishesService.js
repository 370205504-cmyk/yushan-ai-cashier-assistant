const dishesData = require('../data/dishes.json');

class DishesService {
  constructor() {
    this.dishes = dishesData;
  }

  getAllDishes() {
    return this.dishes;
  }

  getMenu({ category, page = 1, limit = 20 } = {}) {
    let filteredDishes = this.dishes;

    if (category) {
      filteredDishes = filteredDishes.filter(d => d.category === category);
    }

    const categories = [...new Set(this.dishes.map(d => d.category))];
    const menu = categories.map(cat => ({
      category: cat,
      dishes: filteredDishes.filter(d => d.category === cat)
    }));

    if (category) {
      return {
        category,
        dishes: filteredDishes.slice((page - 1) * limit, page * limit),
        pagination: {
          page,
          limit,
          total: filteredDishes.length,
          totalPages: Math.ceil(filteredDishes.length / limit)
        }
      };
    }

    return { categories: menu };
  }

  getDishById(id) {
    return this.dishes.find(d => d.id == id || d.id === id) || null;
  }

  getDishesByCategory(category) {
    return this.dishes.filter(d => d.category === category);
  }

  searchDishes(keyword) {
    const lowerKeyword = keyword.toLowerCase();
    return this.dishes.filter(d =>
      d.name.toLowerCase().includes(lowerKeyword) ||
      (d.description && d.description.toLowerCase().includes(lowerKeyword)) ||
      d.category.toLowerCase().includes(lowerKeyword)
    );
  }

  recommendDishes({ taste, budget, count = 3 } = {}) {
    let filtered = [...this.dishes];

    if (taste) {
      const tasteKeywords = this.getTasteKeywords(taste);
      filtered = filtered.filter(d => {
        const searchText = `${d.name} ${d.description || ''}`.toLowerCase();
        return tasteKeywords.some(keyword => searchText.includes(keyword));
      });
    }

    if (budget) {
      filtered = this.filterByBudget(filtered, budget);
    }

    const signatureDishes = filtered.filter(d => d.isSignature);
    const recommendedDishes = filtered.filter(d => d.isRecommend && !d.isSignature);
    const otherDishes = filtered.filter(d => !d.isSignature && !d.isRecommend);

    const sorted = [
      ...signatureDishes,
      ...recommendedDishes,
      ...otherDishes
    ].slice(0, count);

    return sorted;
  }

  getTasteKeywords(taste) {
    const tasteMap = {
      '辣': ['辣', '香辣', '麻辣', '微辣', '红油', '剁椒', '辣椒'],
      '清淡': ['清淡', '清蒸', '清炒', '白灼', '蒸'],
      '甜': ['甜', '糖醋', '蜜汁', '拔丝'],
      '鲜': ['鲜', '清蒸', '白灼', '蒸'],
      '香': ['香', '煎', '炸', '烤', '爆炒', '干锅']
    };

    return tasteMap[taste] || [];
  }

  filterByBudget(dishes, budget) {
    switch (budget) {
      case 'low':
        return dishes.filter(d => d.price < 50);
      case 'medium':
        return dishes.filter(d => d.price >= 50 && d.price <= 100);
      case 'high':
        return dishes.filter(d => d.price > 100);
      default:
        return dishes;
    }
  }

  getCategories() {
    return [...new Set(this.dishes.map(d => d.category))];
  }

  getSignatureDishes() {
    return this.dishes.filter(d => d.isSignature);
  }

  getRecommendedDishes() {
    return this.dishes.filter(d => d.isRecommend);
  }

  getDishPriceRange() {
    const prices = this.dishes.map(d => d.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      average: Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length)
    };
  }
}

module.exports = new DishesService();
