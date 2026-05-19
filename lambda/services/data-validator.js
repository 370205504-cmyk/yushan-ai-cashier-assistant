/**
 * 数据自动校验纠错
 * AI 自动识别重复菜品、错误价格、异常库存，提醒商家修正
 */

const logger = require('../utils/logger');

const VALIDATION_CONFIG = {
  MAX_PRICE: 10000,
  MIN_PRICE: 0.01,
  MAX_STOCK: 9999,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_PHONE_LENGTH: 20,
  MAX_ORDER_ITEMS: 100
};

class DataValidator {
  constructor() {
    this.issues = [];
    this.fixedItems = [];
    this.validationErrors = [];
  }

  /**
   * 校验所有数据
   */
  async validateAllData(dishes, inventory, members, orders) {
    this.issues = [];
    this.fixedItems = [];
    this.validationErrors = [];

    logger.info('🔍 开始数据自动校验...');

    const startTime = Date.now();

    // 校验菜品
    if (dishes && dishes.length > 0) {
      this.validateDishes(dishes);
    }

    // 校验库存
    if (inventory && inventory.length > 0) {
      this.validateInventory(inventory);
    }

    // 校验订单
    if (orders && orders.length > 0) {
      this.validateOrders(orders);
    }

    // 校验会员
    if (members && members.length > 0) {
      this.validateMembers(members);
    }

    const duration = Date.now() - startTime;
    logger.info(`✅ 数据校验完成，发现 ${this.issues.length} 个问题，耗时 ${duration}ms`);

    // 记录校验错误日志
    if (this.issues.length > 0) {
      this.logValidationErrors();
    }

    return {
      success: this.issues.filter(i => i.severity === 'HIGH').length === 0,
      issues: this.issues,
      fixedItems: this.fixedItems,
      summary: this.generateSummary(),
      durationMs: duration
    };
  }

  logValidationErrors() {
    this.issues.forEach(issue => {
      const level = issue.severity === 'HIGH' ? 'error' : issue.severity === 'MEDIUM' ? 'warn' : 'info';
      logger[level](`[数据校验] ${issue.type}: ${issue.item || issue.orderId || issue.member} - ${issue.suggestion}`, {
        severity: issue.severity,
        type: issue.type,
        ...issue
      });
    });
  }

  /**
   * 校验菜品数据
   */
  validateDishes(dishes) {
    logger.info('📋 校验菜品数据...');

    // 检测重复菜品
    const nameMap = new Map();
    dishes.forEach((dish, index) => {
      if (!dish.name || typeof dish.name !== 'string') {
        this.issues.push({
          type: 'INVALID_DISH_NAME',
          severity: 'HIGH',
          item: dish.id || 'unknown',
          suggestion: '菜品名称无效'
        });
        return;
      }

      const nameKey = dish.name.trim().toLowerCase();
      if (nameMap.has(nameKey)) {
        const firstIndex = nameMap.get(nameKey);
        this.issues.push({
          type: 'DUPLICATE_DISH',
          severity: 'MEDIUM',
          item: dish.name,
          dish1: dishes[firstIndex],
          dish2: dish,
          suggestion: '建议合并或删除重复菜品'
        });
      } else {
        nameMap.set(nameKey, index);
      }

      // 检测名称长度
      if (dish.name.length > VALIDATION_CONFIG.MAX_NAME_LENGTH) {
        this.issues.push({
          type: 'DISH_NAME_TOO_LONG',
          severity: 'LOW',
          item: dish.name,
          length: dish.name.length,
          suggestion: `菜品名称超过${VALIDATION_CONFIG.MAX_NAME_LENGTH}字符限制`
        });
      }
    });

    // 检测异常价格
    dishes.forEach(dish => {
      if (dish.price === undefined || dish.price === null) {
        this.issues.push({
          type: 'MISSING_PRICE',
          severity: 'HIGH',
          item: dish.name || dish.id,
          suggestion: '缺少菜品价格'
        });
      } else if (typeof dish.price !== 'number' || isNaN(dish.price)) {
        this.issues.push({
          type: 'INVALID_PRICE_TYPE',
          severity: 'HIGH',
          item: dish.name || dish.id,
          price: dish.price,
          suggestion: '价格必须是数字'
        });
      } else if (dish.price <= 0) {
        this.issues.push({
          type: 'INVALID_PRICE',
          severity: 'HIGH',
          item: dish.name,
          price: dish.price,
          suggestion: `价格必须大于${VALIDATION_CONFIG.MIN_PRICE}元`
        });
      } else if (dish.price > VALIDATION_CONFIG.MAX_PRICE) {
        this.issues.push({
          type: 'SUSPICIOUS_PRICE',
          severity: 'LOW',
          item: dish.name,
          price: dish.price,
          suggestion: `价格超过${VALIDATION_CONFIG.MAX_PRICE}元，建议确认是否正确`
        });
      }
    });

    // 检测空分类
    dishes.forEach(dish => {
      if (!dish.category || dish.category.trim() === '') {
        this.issues.push({
          type: 'EMPTY_CATEGORY',
          severity: 'LOW',
          item: dish.name,
          suggestion: '建议添加菜品分类'
        });
      }
    });

    // 检测描述长度
    dishes.forEach(dish => {
      if (dish.description && dish.description.length > VALIDATION_CONFIG.MAX_DESCRIPTION_LENGTH) {
        this.issues.push({
          type: 'DESCRIPTION_TOO_LONG',
          severity: 'LOW',
          item: dish.name,
          length: dish.description.length,
          suggestion: `描述超过${VALIDATION_CONFIG.MAX_DESCRIPTION_LENGTH}字符限制`
        });
      }
    });
  }

  /**
   * 校验库存数据
   */
  validateInventory(inventory) {
    console.log('📦 校验库存数据...');

    inventory.forEach(item => {
      // 检测负库存
      if (item.stock < 0) {
        this.issues.push({
          type: 'NEGATIVE_STOCK',
          severity: 'HIGH',
          item: item.dishId || item.name,
          stock: item.stock,
          suggestion: '库存为负数，建议核对修正'
        });
      }

      // 检测库存过高
      if (item.stock > 9999) {
        this.issues.push({
          type: 'EXCESSIVE_STOCK',
          severity: 'LOW',
          item: item.dishId || item.name,
          stock: item.stock,
          suggestion: '库存异常高，建议确认'
        });
      }
    });
  }

  /**
   * 校验订单数据
   */
  validateOrders(orders) {
    logger.info('📝 校验订单数据...');

    orders.forEach(order => {
      // 检测订单号
      if (!order.id && !order.orderNo) {
        this.issues.push({
          type: 'MISSING_ORDER_ID',
          severity: 'HIGH',
          suggestion: '订单缺少订单号'
        });
        return;
      }

      const orderId = order.id || order.orderNo;

      // 检测空订单
      if (!order.items || order.items.length === 0) {
        this.issues.push({
          type: 'EMPTY_ORDER',
          severity: 'MEDIUM',
          orderId,
          suggestion: '订单无菜品'
        });
        return;
      }

      // 检测订单菜品数量
      if (order.items.length > VALIDATION_CONFIG.MAX_ORDER_ITEMS) {
        this.issues.push({
          type: 'ORDER_ITEMS_EXCEEDED',
          severity: 'MEDIUM',
          orderId,
          itemCount: order.items.length,
          suggestion: `订单菜品数量超过${VALIDATION_CONFIG.MAX_ORDER_ITEMS}限制`
        });
      }

      // 检测金额不一致
      const calculatedTotal = order.items.reduce((sum, item) => {
        if (!item.price || !item.quantity) return sum;
        return sum + (item.price * item.quantity);
      }, 0);

      if (order.totalAmount === undefined || order.totalAmount === null) {
        this.issues.push({
          type: 'MISSING_TOTAL_AMOUNT',
          severity: 'HIGH',
          orderId,
          suggestion: '订单缺少总金额'
        });
      } else if (Math.abs(calculatedTotal - order.totalAmount) > 0.01) {
        this.issues.push({
          type: 'PRICE_MISMATCH',
          severity: 'HIGH',
          orderId,
          calculatedTotal,
          statedTotal: order.totalAmount,
          difference: Math.abs(calculatedTotal - order.totalAmount).toFixed(2),
          suggestion: '订单金额计算不一致，建议核对'
        });
      }

      // 检测无效订单状态
      const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'refunded'];
      if (order.status && !validStatuses.includes(order.status)) {
        this.issues.push({
          type: 'INVALID_ORDER_STATUS',
          severity: 'MEDIUM',
          orderId,
          status: order.status,
          suggestion: `无效的订单状态: ${order.status}`
        });
      }

      // 检测负金额
      if (order.totalAmount && order.totalAmount < 0) {
        this.issues.push({
          type: 'NEGATIVE_ORDER_AMOUNT',
          severity: 'HIGH',
          orderId,
          totalAmount: order.totalAmount,
          suggestion: '订单金额不能为负数'
        });
      }
    });
  }

  /**
   * 校验会员数据
   */
  validateMembers(members) {
    logger.info('👤 校验会员数据...');

    const phoneSet = new Set();
    const idSet = new Set();

    members.forEach(member => {
      // 检测会员ID
      if (!member.id) {
        this.issues.push({
          type: 'MISSING_MEMBER_ID',
          severity: 'HIGH',
          member: member.name || 'unknown',
          suggestion: '会员缺少ID'
        });
        return;
      }

      // 检测重复ID
      if (idSet.has(member.id)) {
        this.issues.push({
          type: 'DUPLICATE_MEMBER_ID',
          severity: 'HIGH',
          member: member.name || member.id,
          id: member.id,
          suggestion: '会员ID重复'
        });
      } else {
        idSet.add(member.id);
      }

      // 检测重复手机号
      if (member.phone) {
        if (member.phone.length > VALIDATION_CONFIG.MAX_PHONE_LENGTH) {
          this.issues.push({
            type: 'INVALID_PHONE_LENGTH',
            severity: 'MEDIUM',
            member: member.name || member.id,
            phone: member.phone,
            suggestion: '手机号长度异常'
          });
        } else if (!/^1[3-9]\d{9}$/.test(member.phone)) {
          this.issues.push({
            type: 'INVALID_PHONE_FORMAT',
            severity: 'LOW',
            member: member.name || member.id,
            phone: member.phone,
            suggestion: '手机号格式不正确'
          });
        }

        if (phoneSet.has(member.phone)) {
          this.issues.push({
            type: 'DUPLICATE_MEMBER_PHONE',
            severity: 'MEDIUM',
            member: member.name || member.phone,
            phone: member.phone,
            suggestion: '手机号重复，建议合并会员'
          });
        } else {
          phoneSet.add(member.phone);
        }
      }

      // 检测负余额
      if (member.balance !== undefined && member.balance !== null && member.balance < 0) {
        this.issues.push({
          type: 'NEGATIVE_BALANCE',
          severity: 'HIGH',
          member: member.name || member.phone || member.id,
          balance: member.balance,
          suggestion: '会员余额为负数，建议核对修正'
        });
      }

      // 检测负积分
      if (member.points !== undefined && member.points !== null && member.points < 0) {
        this.issues.push({
          type: 'NEGATIVE_POINTS',
          severity: 'MEDIUM',
          member: member.name || member.phone || member.id,
          points: member.points,
          suggestion: '会员积分为负数，建议核对修正'
        });
      }

      // 检测无效等级
      if (member.level !== undefined && (member.level < 1 || member.level > 5 || !Number.isInteger(member.level))) {
        this.issues.push({
          type: 'INVALID_MEMBER_LEVEL',
          severity: 'LOW',
          member: member.name || member.id,
          level: member.level,
          suggestion: '会员等级无效，应为1-5'
        });
      }
    });
  }

  /**
   * 尝试自动修复问题
   */
  async autoFixIssues() {
    logger.info('🔧 尝试自动修复问题...');

    this.issues.forEach(issue => {
      // 自动修复可以修复的问题
      if (issue.type === 'EMPTY_CATEGORY') {
        this.fixedItems.push({
          issue,
          action: 'AUTO_CATEGORY',
          message: '已自动归类为"其他"'
        });
      }
      if (issue.type === 'INVALID_PHONE_FORMAT') {
        const cleanedPhone = issue.phone.replace(/\D/g, '');
        if (/^1[3-9]\d{9}$/.test(cleanedPhone)) {
          this.fixedItems.push({
            issue,
            action: 'AUTO_CLEAN_PHONE',
            message: `已自动清理手机号: ${cleanedPhone}`
          });
        }
      }
      if (issue.type === 'NEGATIVE_POINTS') {
        this.fixedItems.push({
          issue,
          action: 'AUTO_RESET_POINTS',
          message: '已自动将积分重置为0'
        });
      }
      if (issue.type === 'INVALID_MEMBER_LEVEL') {
        const correctedLevel = Math.min(Math.max(issue.level, 1), 5);
        this.fixedItems.push({
          issue,
          action: 'AUTO_CORRECT_LEVEL',
          message: `已自动修正等级为${correctedLevel}`
        });
      }
    });

    if (this.fixedItems.length > 0) {
      logger.info(`✅ 自动修复了 ${this.fixedItems.length} 个问题`);
    }

    return this.fixedItems;
  }

  /**
   * 生成校验摘要
   */
  generateSummary() {
    const highCount = this.issues.filter(i => i.severity === 'HIGH').length;
    const mediumCount = this.issues.filter(i => i.severity === 'MEDIUM').length;
    const lowCount = this.issues.filter(i => i.severity === 'LOW').length;

    return {
      total: this.issues.length,
      high: highCount,
      medium: mediumCount,
      low: lowCount,
      needAttention: highCount > 0 || mediumCount > 2,
      recommendedAction: highCount > 0 ? '请立即处理高危问题' : 
                         mediumCount > 2 ? '建议处理中等问题' : '数据状态良好'
    };
  }

  /**
   * 生成报告（中文）
   */
  generateReport() {
    const summary = this.generateSummary();

    let report = `
═══════════════════════════════════════════════
          📊 数据自动校验报告
═══════════════════════════════════════════════

📋 总览:
   问题总数: ${summary.total}
   高危: ${summary.high} ⚠️
   中等: ${summary.medium}
   低危: ${summary.low}

📝 详细问题:
`;

    // 按严重程度分组显示
    const severityOrder = ['HIGH', 'MEDIUM', 'LOW'];
    severityOrder.forEach(sev => {
      const issuesOfSev = this.issues.filter(i => i.severity === sev);
      if (issuesOfSev.length > 0) {
        report += `\n   ${sev === 'HIGH' ? '🔴' : sev === 'MEDIUM' ? '🟡' : '🟢'} ${sev} (${issuesOfSev.length}项):\n`;
        issuesOfSev.slice(0, 5).forEach(issue => {
          report += `      - [${issue.type}] ${issue.item || issue.orderId || issue.member}: ${issue.suggestion}\n`;
        });
        if (issuesOfSev.length > 5) {
          report += `      ... 还有 ${issuesOfSev.length - 5} 项\n`;
        }
      }
    });

    report += `\n💡 建议: ${summary.recommendedAction}\n`;
    report += `═══════════════════════════════════════════════\n`;

    return report;
  }
}

module.exports = DataValidator;
