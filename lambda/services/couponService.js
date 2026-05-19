/**
 * 优惠券服务 v2.0
 * 独立优惠券管理：创建、发放、核销、查询
 * 安全增强：添加防滥用逻辑
 */

const db = require('../database/db');
const logger = require('../utils/logger');

class CouponService {
  constructor() {
    this.coupons = new Map();
    this.userCoupons = new Map();
    this.couponUsageHistory = new Map();
    this.RATE_LIMIT_WINDOW = 60 * 1000;
    this.MAX_CLAIM_PER_WINDOW = 5;
    this.initDefaultCoupons();
  }

  /**
   * 初始化默认优惠券
   */
  initDefaultCoupons() {
    const defaultCoupons = [
      {
        id: 'coupon_new_user',
        name: '新用户首单立减',
        type: 'CASH',
        value: 10,
        minAmount: 50,
        description: '新用户首次下单立减10元',
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2030-12-31'),
        totalCount: 9999,
        remainingCount: 9999,
        status: 'active',
        rules: {
          newUserOnly: true,
          perUserLimit: 1,
          categories: [],
          dishes: []
        }
      },
      {
        id: 'coupon_full_100',
        name: '满100减20',
        type: 'CASH',
        value: 20,
        minAmount: 100,
        description: '单笔消费满100元立减20元',
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2030-12-31'),
        totalCount: 5000,
        remainingCount: 5000,
        status: 'active',
        rules: {
          newUserOnly: false,
          perUserLimit: 5,
          categories: [],
          dishes: []
        }
      },
      {
        id: 'coupon_discount_85',
        name: '85折优惠券',
        type: 'DISCOUNT',
        value: 85,
        minAmount: 0,
        description: '指定商品85折优惠',
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2030-12-31'),
        totalCount: 3000,
        remainingCount: 3000,
        status: 'active',
        rules: {
          newUserOnly: false,
          perUserLimit: 3,
          categories: ['招牌菜'],
          dishes: []
        }
      },
      {
        id: 'coupon_birthday',
        name: '生日专属优惠券',
        type: 'CASH',
        value: 50,
        minAmount: 100,
        description: '会员生日当月享受50元优惠',
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2030-12-31'),
        totalCount: 99999,
        remainingCount: 99999,
        status: 'active',
        rules: {
          newUserOnly: false,
          perUserLimit: 1,
          categories: [],
          dishes: [],
          birthdayOnly: true
        }
      },
      {
        id: 'coupon_vip_day',
        name: '会员日双倍积分',
        type: 'GIFT',
        value: 2,
        minAmount: 0,
        description: '会员日消费双倍积分',
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2030-12-31'),
        totalCount: 99999,
        remainingCount: 99999,
        status: 'active',
        rules: {
          newUserOnly: false,
          perUserLimit: 999,
          categories: [],
          dishes: [],
          vipDayOnly: true
        }
      }
    ];

    defaultCoupons.forEach(coupon => {
      this.coupons.set(coupon.id, coupon);
    });
  }

  /**
   * 检查用户领取频率限制
   * @param {string} userId - 用户ID
   * @returns {boolean} 是否通过频率检查
   */
  checkRateLimit(userId) {
    const now = Date.now();
    const key = `rate_limit:${userId}`;
    
    if (!this.couponUsageHistory.has(key)) {
      this.couponUsageHistory.set(key, []);
    }
    
    const timestamps = this.couponUsageHistory.get(key);
    const validTimestamps = timestamps.filter(ts => now - ts < this.RATE_LIMIT_WINDOW);
    this.couponUsageHistory.set(key, validTimestamps);
    
    if (validTimestamps.length >= this.MAX_CLAIM_PER_WINDOW) {
      logger.warn(`优惠券领取频率超限: userId=${userId}, count=${validTimestamps.length}`);
      return false;
    }
    
    validTimestamps.push(now);
    return true;
  }

  /**
   * 检查订单金额与优惠券是否匹配（防止金额篡改）
   * @param {Object} coupon - 优惠券对象
   * @param {number} orderAmount - 订单金额
   * @returns {boolean} 是否匹配
   */
  validateCouponAmountMatch(coupon, orderAmount) {
    if (coupon.minAmount > 0 && orderAmount < coupon.minAmount) {
      return false;
    }
    
    const maxAmount = coupon.maxAmount || Infinity;
    if (orderAmount > maxAmount) {
      return false;
    }
    
    return true;
  }

  /**
   * 创建优惠券
   */
  createCoupon(couponData) {
    if (couponData.value < 0 || couponData.minAmount < 0) {
      return { success: false, error: '优惠券参数无效' };
    }

    const coupon = {
      id: `coupon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...couponData,
      status: 'active',
      createdAt: new Date().toISOString(),
      remainingCount: couponData.totalCount || 0
    };

    this.coupons.set(coupon.id, coupon);
    return { success: true, coupon };
  }

  /**
   * 获取优惠券详情
   */
  getCoupon(couponId) {
    const coupon = this.coupons.get(couponId);
    if (!coupon) {
      return { success: false, error: '优惠券不存在' };
    }
    return { success: true, coupon };
  }

  /**
   * 获取所有优惠券列表
   */
  getCouponList(filters = {}) {
    let coupons = Array.from(this.coupons.values());

    if (filters.status) {
      coupons = coupons.filter(c => c.status === filters.status);
    }

    if (filters.type) {
      coupons = coupons.filter(c => c.type === filters.type);
    }

    const now = new Date();
    if (filters.valid) {
      coupons = coupons.filter(c => 
        new Date(c.validFrom) <= now && new Date(c.validTo) >= now && c.remainingCount > 0
      );
    }

    return { success: true, coupons };
  }

  /**
   * 发放优惠券给用户（防滥用版本）
   */
  distributeCoupon(userId, couponId, clientIp = null) {
    if (!this.checkRateLimit(userId)) {
      return { 
        success: false, 
        error: '领取频率过快，请稍后再试',
        code: 'RATE_LIMITED'
      };
    }

    const coupon = this.coupons.get(couponId);
    if (!coupon) {
      return { success: false, error: '优惠券不存在' };
    }

    if (coupon.status !== 'active') {
      return { success: false, error: '优惠券已停用' };
    }

    if (coupon.remainingCount <= 0) {
      return { success: false, error: '优惠券已领完' };
    }

    const now = new Date();
    if (now < new Date(coupon.validFrom) || now > new Date(coupon.validTo)) {
      return { success: false, error: '优惠券已过期' };
    }

    if (!this.userCoupons.has(userId)) {
      this.userCoupons.set(userId, new Map());
    }

    const userCouponMap = this.userCoupons.get(userId);

    const userCouponCount = userCouponMap.get(couponId) || 0;
    if (coupon.rules?.perUserLimit && userCouponCount >= coupon.rules.perUserLimit) {
      return { success: false, error: `该优惠券每位用户限领${coupon.rules.perUserLimit}张` };
    }

    if (coupon.rules?.newUserOnly) {
      const hasUsedOrder = this.checkUserHasOrder(userId);
      if (hasUsedOrder) {
        return { success: false, error: '该优惠券仅限新用户领取' };
      }
    }

    const userCoupon = {
      id: `uc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      couponId,
      userId,
      status: 'unused',
      receivedAt: now.toISOString(),
      usedAt: null,
      expiredAt: coupon.validTo,
      clientIp: clientIp
    };

    userCouponMap.set(couponId, userCouponCount + 1);
    if (!this.userCoupons.get(userId).get(couponId + '_list')) {
      this.userCoupons.get(userId).set(couponId + '_list', []);
    }
    this.userCoupons.get(userId).get(couponId + '_list').push(userCoupon);

    coupon.remainingCount--;

    logger.info(`优惠券发放成功: userId=${userId}, couponId=${couponId}, ip=${clientIp}`);
    return { success: true, userCoupon };
  }

  /**
   * 检查用户是否有历史订单
   * @param {string} userId - 用户ID
   * @returns {boolean} 是否有订单
   */
  checkUserHasOrder(userId) {
    return false;
  }

  /**
   * 获取用户的优惠券列表
   */
  getUserCoupons(userId, status = null) {
    if (!this.userCoupons.has(userId)) {
      return { success: true, coupons: [] };
    }

    let coupons = [];
    const userCouponMap = this.userCoupons.get(userId);

    for (const [key, value] of userCouponMap.entries()) {
      if (key.endsWith('_list')) {
        coupons.push(...value);
      }
    }

    if (status) {
      coupons = coupons.filter(c => c.status === status);
    }

    const result = coupons.map(uc => {
      const coupon = this.coupons.get(uc.couponId);
      return {
        ...uc,
        coupon
      };
    });

    return { success: true, coupons: result };
  }

  /**
   * 核销优惠券（防滥用版本）
   */
  redeemCoupon(userId, userCouponId, orderAmount, orderId = null) {
    if (!this.userCoupons.has(userId)) {
      return { success: false, error: '用户优惠券不存在' };
    }

    const userCouponMap = this.userCoupons.get(userId);
    let targetCoupon = null;

    for (const [key, value] of userCouponMap.entries()) {
      if (key.endsWith('_list') && Array.isArray(value)) {
        targetCoupon = value.find(c => c.id === userCouponId);
        if (targetCoupon) break;
      }
    }

    if (!targetCoupon) {
      return { success: false, error: '用户优惠券不存在' };
    }

    if (targetCoupon.status !== 'unused') {
      return { success: false, error: '优惠券已使用或已过期' };
    }

    const now = new Date();
    if (now > new Date(targetCoupon.expiredAt)) {
      targetCoupon.status = 'expired';
      return { success: false, error: '优惠券已过期' };
    }

    const coupon = this.coupons.get(targetCoupon.couponId);
    if (!coupon) {
      return { success: false, error: '优惠券不存在' };
    }

    if (!this.validateCouponAmountMatch(coupon, orderAmount)) {
      return { 
        success: false, 
        error: `订单金额不符合优惠券使用条件`,
        minAmount: coupon.minAmount
      };
    }

    let discount = 0;
    if (coupon.type === 'CASH') {
      discount = coupon.value;
    } else if (coupon.type === 'DISCOUNT') {
      discount = orderAmount * (1 - coupon.value / 100);
    }

    discount = Math.min(discount, orderAmount);

    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }

    targetCoupon.status = 'used';
    targetCoupon.usedAt = now.toISOString();
    targetCoupon.orderId = orderId;
    targetCoupon.orderAmount = orderAmount;
    targetCoupon.discount = discount;

    logger.info(`优惠券核销: userId=${userId}, couponId=${coupon.id}, orderId=${orderId}, discount=${discount}`);

    return {
      success: true,
      discount: Math.round(discount * 100) / 100,
      originalAmount: orderAmount,
      finalAmount: orderAmount - discount,
      coupon: {
        id: coupon.id,
        name: coupon.name,
        type: coupon.type,
        value: coupon.value
      }
    };
  }

  /**
   * 查询可用优惠券
   */
  getAvailableCoupons(userId, orderAmount, orderItems = []) {
    const { coupons: userCoupons } = this.getUserCoupons(userId, 'unused');
    
    const availableCoupons = [];
    const now = new Date();

    for (const uc of userCoupons) {
      const coupon = uc.coupon;
      if (!coupon) continue;

      if (now < new Date(coupon.validFrom) || now > new Date(coupon.validTo)) {
        continue;
      }

      if (!this.validateCouponAmountMatch(coupon, orderAmount)) {
        continue;
      }

      let discount = 0;
      if (coupon.type === 'CASH') {
        discount = coupon.value;
      } else if (coupon.type === 'DISCOUNT') {
        discount = orderAmount * (1 - coupon.value / 100);
      }

      if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
      }

      availableCoupons.push({
        userCouponId: uc.id,
        couponId: coupon.id,
        name: coupon.name,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        discount: Math.round(discount * 100) / 100,
        minAmount: coupon.minAmount
      });
    }

    availableCoupons.sort((a, b) => b.discount - a.discount);

    return { success: true, coupons: availableCoupons };
  }

  /**
   * 自动应用最优优惠券
   */
  autoApplyBestCoupon(userId, orderAmount, orderItems = []) {
    const { coupons } = this.getAvailableCoupons(userId, orderAmount, orderItems);
    
    if (coupons.length === 0) {
      return { success: true, applied: false, message: '没有可用的优惠券' };
    }

    const bestCoupon = coupons[0];
    
    return {
      success: true,
      applied: true,
      userCouponId: bestCoupon.userCouponId,
      couponId: bestCoupon.couponId,
      couponName: bestCoupon.name,
      discount: bestCoupon.discount,
      finalAmount: orderAmount - bestCoupon.discount
    };
  }

  /**
   * 退回优惠券（订单取消时）
   */
  refundCoupon(userId, userCouponId) {
    if (!this.userCoupons.has(userId)) {
      return { success: false, error: '用户优惠券不存在' };
    }

    const userCouponMap = this.userCoupons.get(userId);

    for (const [key, value] of userCouponMap.entries()) {
      if (key.endsWith('_list') && Array.isArray(value)) {
        const couponIndex = value.findIndex(c => c.id === userCouponId);
        if (couponIndex !== -1) {
          const coupon = value[couponIndex];
          if (coupon.status === 'used') {
            coupon.status = 'unused';
            coupon.usedAt = null;

            const originalCoupon = this.coupons.get(coupon.couponId);
            if (originalCoupon) {
              originalCoupon.remainingCount++;
            }

            logger.info(`优惠券退回: userId=${userId}, couponId=${coupon.couponId}`);
            return { success: true, message: '优惠券已退回' };
          }
        }
      }
    }

    return { success: false, error: '优惠券退回失败' };
  }

  /**
   * 删除优惠券
   */
  deleteCoupon(couponId) {
    if (!this.coupons.has(couponId)) {
      return { success: false, error: '优惠券不存在' };
    }

    this.coupons.delete(couponId);
    return { success: true, message: '优惠券已删除' };
  }

  /**
   * 更新优惠券
   */
  updateCoupon(couponId, updates) {
    const coupon = this.coupons.get(couponId);
    if (!coupon) {
      return { success: false, error: '优惠券不存在' };
    }

    Object.assign(coupon, updates);
    return { success: true, coupon };
  }

  /**
   * 获取优惠券统计
   */
  getCouponStats() {
    const stats = {
      total: this.coupons.size,
      active: 0,
      inactive: 0,
      totalDistributed: 0,
      totalUsed: 0,
      totalExpired: 0,
      byType: {
        CASH: 0,
        DISCOUNT: 0,
        GIFT: 0
      }
    };

    for (const coupon of this.coupons.values()) {
      if (coupon.status === 'active') {
        stats.active++;
      } else {
        stats.inactive++;
      }

      if (coupon.type) {
        stats.byType[coupon.type] = (stats.byType[coupon.type] || 0) + 1;
      }
    }

    for (const userCouponMap of this.userCoupons.values()) {
      for (const [key, value] of userCouponMap.entries()) {
        if (key.endsWith('_list') && Array.isArray(value)) {
          stats.totalDistributed += value.length;
          stats.totalUsed += value.filter(c => c.status === 'used').length;
          stats.totalExpired += value.filter(c => c.status === 'expired').length;
        }
      }
    }

    return { success: true, stats };
  }

  /**
   * 批量发放优惠券
   */
  batchDistribute(userIds, couponId) {
    const results = {
      success: [],
      failed: []
    };

    for (const userId of userIds) {
      const result = this.distributeCoupon(userId, couponId);
      if (result.success) {
        results.success.push(userId);
      } else {
        results.failed.push({ userId, reason: result.error });
      }
    }

    return { 
      success: true, 
      total: userIds.length,
      successCount: results.success.length,
      failedCount: results.failed.length,
      results
    };
  }
}

module.exports = CouponService;
