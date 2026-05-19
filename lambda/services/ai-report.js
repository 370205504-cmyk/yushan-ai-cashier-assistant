/**
 * AI经营简报 - 每日自动生成营收、客流、爆款菜品分析
 */

class AIReport {
  constructor() {
    this.dailyData = [];
  }

  /**
   * 记录每日数据
   */
  recordDailyData(date, data) {
    this.dailyData.push({
      date,
      ...data
    });
  }

  /**
   * 生成AI经营简报
   */
  generateDailyReport(date = new Date()) {
    const dateStr = date.toISOString().split('T')[0];
    
    // 模拟数据（实际项目应该从数据库读取）
    const todayData = {
      totalRevenue: 12850,
      orderCount: 156,
      customerCount: 120,
      avgOrderValue: 82.37,
      topDishes: [
        { name: '宫保鸡丁', count: 45, revenue: 1260 },
        { name: '鱼香肉丝', count: 38, revenue: 988 },
        { name: '麻婆豆腐', count: 32, revenue: 576 },
        { name: '红烧肉', count: 28, revenue: 896 },
        { name: '糖醋里脊', count: 25, revenue: 750 }
      ],
      peakHours: [
        { hour: 12, count: 45 },
        { hour: 18, count: 52 },
        { hour: 19, count: 48 }
      ],
      newCustomers: 35,
      returningCustomers: 85,
      onlineOrders: 45,
      offlineOrders: 111
    };

    const yesterdayRevenue = 11200;
    const weekBeforeRevenue = 9800;

    const report = this.formatReport(dateStr, todayData, yesterdayRevenue, weekBeforeRevenue);
    
    return report;
  }

  /**
   * 格式化报告
   */
  formatReport(dateStr, todayData, yesterdayRevenue, weekBeforeRevenue) {
    const revenueGrowth = ((todayData.totalRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1);
    const weekGrowth = ((todayData.totalRevenue - weekBeforeRevenue) / weekBeforeRevenue * 100).toFixed(1);

    const topDishesText = todayData.topDishes.map((dish, idx) => 
      `${idx + 1}. ${dish.name} - ${dish.count}份，营收¥${dish.revenue}`
    ).join('\n');

    const peakHoursText = todayData.peakHours.map(p => 
      `${p.hour}:00 - ${p.count}单`
    ).join('\n');

    const insights = this.generateInsights(todayData, revenueGrowth, weekGrowth);

    return `
📊 【${dateStr} 经营日报】

💰 今日总营收：¥${todayData.totalRevenue}
📈 较昨日：${revenueGrowth > 0 ? '+' : ''}${revenueGrowth}%
📈 较上周：${weekGrowth > 0 ? '+' : ''}${weekGrowth}%

📦 今日订单：${todayData.orderCount}单
👥 客流人数：${todayData.customerCount}人
💵 客单价：¥${todayData.avgOrderValue.toFixed(2)}

🏆 爆款菜品TOP5：
${topDishesText}

⏰ 高峰时段：
${peakHoursText}

👤 新客：${todayData.newCustomers}人 | 回头客：${todayData.returningCustomers}人
📱 线上：${todayData.onlineOrders}单 | 线下：${todayData.offlineOrders}单

💡 AI分析建议：
${insights}
`;
  }

  /**
   * 生成AI洞察
   */
  generateInsights(data, revenueGrowth, weekGrowth) {
    const insights = [];

    if (revenueGrowth > 10) {
      insights.push('✅ 今日营收大幅增长，生意不错！继续保持！');
    } else if (revenueGrowth > 0) {
      insights.push('📈 今日营收稳步上升，可以考虑加推热门套餐！');
    } else if (revenueGrowth > -10) {
      insights.push('📉 营收略有下滑，可以看看是否需要做活动了！');
    } else {
      insights.push('⚠️ 营收下滑明显，建议分析原因并做促销活动！');
    }

    if (data.returningCustomers / data.customerCount > 0.6) {
      insights.push('💖 回头客占比很高，说明菜品口碑不错！');
    }

    const topDish = data.topDishes[0];
    insights.push(`🔥 「${topDish.name}」是今日招牌，可以考虑做爆款套餐！`);

    if (data.peakHours.length > 0) {
      const busiestHour = data.peakHours.reduce((a, b) => a.count > b.count ? a : b);
      insights.push(`⏰ ${busiestHour.hour}:00是最忙时段，建议提前备菜！`);
    }

    return insights.join('\n');
  }

  /**
   * 发送报告到老板微信
   */
  async sendReportToWeChat(report) {
    console.log('发送经营日报给老板...');
    console.log(report);
    // 这里应该调用企业微信/微信机器人API发送
    return { success: true, message: '日报已发送' };
  }

  /**
   * 自动定时发送日报（比如每天22:00）
   */
  scheduleDailyReport() {
    // 实际项目应该用node-cron
    console.log('已设置每日22:00自动发送经营日报');
  }
}

module.exports = AIReport;
