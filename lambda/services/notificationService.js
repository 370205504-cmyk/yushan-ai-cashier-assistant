const axios = require('axios');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.File({ filename: 'logs/notification.log' })]
});

class NotificationService {
  constructor() {
    this.wechatConfig = {
      appId: process.env.WECHAT_APPID,
      appSecret: process.env.WECHAT_SECRET,
      templateId: {
        orderConfirm: process.env.WECHAT_TEMPLATE_ORDER_CONFIRM,
        orderReady: process.env.WECHAT_TEMPLATE_ORDER_READY,
        deliveryNotice: process.env.WECHAT_TEMPLATE_DELIVERY
      }
    };
  }

  async sendWechatTemplateMessage(openid, templateId, data, page = '') {
    try {
      const accessToken = await this.getAccessToken();
      const url = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`;

      const message = {
        touser: openid,
        template_id: templateId,
        page,
        data: {
          keyword1: { value: data.orderNo, color: '#173177' },
          keyword2: { value: data.status, color: '#173177' },
          keyword3: { value: data.time || new Date().toLocaleString('zh-CN'), color: '#173177' },
          remark: { value: data.remark || '感谢您的支持', color: '#999999' }
        }
      };

      const response = await axios.post(url, message);
      logger.info(`微信模板消息发送: ${openid} -> ${templateId}`);
      return { success: true, msgid: response.data.msgid };
    } catch (error) {
      logger.error('微信模板消息发送失败:', error.response?.data || error.message);
      return { success: false, message: '发送失败' };
    }
  }

  async getAccessToken() {
    try {
      const response = await axios.get(
        `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.wechatConfig.appId}&secret=${this.wechatConfig.appSecret}`
      );
      return response.data.access_token;
    } catch (error) {
      logger.error('获取access_token失败:', error.message);
      throw error;
    }
  }

  async sendSms(phone, templateCode, params) {
    try {
      logger.info(`短信发送: ${phone} -> ${templateCode}`, { params });
      return { success: true };
    } catch (error) {
      logger.error('短信发送失败:', error.message);
      return { success: false, message: '发送失败' };
    }
  }

  async notifyOrderCreated(order) {
    const results = [];

    if (order.userWechatOpenid && this.wechatConfig.templateId.orderConfirm) {
      const result = await this.sendWechatTemplateMessage(
        order.userWechatOpenid,
        this.wechatConfig.templateId.orderConfirm,
        {
          orderNo: order.orderNo,
          status: '订单已提交',
          time: new Date().toLocaleString('zh-CN'),
          remark: `金额: ¥${order.finalAmount}`
        },
        `/pages/order/detail?orderNo=${order.orderNo}`
      );
      results.push({ type: 'wechat', ...result });
    }

    if (order.userPhone) {
      const result = await this.sendSms(order.userPhone, 'SMS_ORDER_CREATE', {
        orderNo: order.orderNo,
        amount: order.finalAmount
      });
      results.push({ type: 'sms', ...result });
    }

    return results;
  }

  async notifyOrderStatusChange(order, newStatus) {
    const statusMessages = {
      'confirmed': '商家已接单',
      'preparing': '厨房正在准备中',
      'ready': '您的菜品已准备好',
      'delivering': '配送员正在配送中',
      'completed': '订单已完成'
    };

    const results = [];

    if (order.userWechatOpenid && this.wechatConfig.templateId.orderReady) {
      const result = await this.sendWechatTemplateMessage(
        order.userWechatOpenid,
        this.wechatConfig.templateId.orderReady,
        {
          orderNo: order.orderNo,
          status: statusMessages[newStatus] || newStatus,
          time: new Date().toLocaleString('zh-CN'),
          remark: newStatus === 'completed' ? '感谢您的光临，欢迎再次下单' : ''
        }
      );
      results.push({ type: 'wechat', ...result });
    }

    return results;
  }

  async notifyDeliveryUpdate(delivery, order) {
    const results = [];

    if (order.userWechatOpenid && this.wechatConfig.templateId.deliveryNotice) {
      let statusText = '配送员已接单';
      if (delivery.status === 'picking_up') {
        statusText = '配送员正在取餐';
      }
      if (delivery.status === 'delivering') {
        statusText = '配送员正在配送中';
      }
      if (delivery.status === 'completed') {
        statusText = '已送达';
      }

      const result = await this.sendWechatTemplateMessage(
        order.userWechatOpenid,
        this.wechatConfig.templateId.deliveryNotice,
        {
          orderNo: order.orderNo,
          status: statusText,
          time: new Date().toLocaleString('zh-CN'),
          remark: delivery.driverName ? `配送员: ${delivery.driverName}` : ''
        }
      );
      results.push({ type: 'wechat', ...result });
    }

    return results;
  }

  async notifyLowStockAlert(dishes) {
    logger.warn('低库存预警', { dishes: dishes.map(d => `${d.name}: ${d.stock}`) });

    const adminPhones = process.env.ADMIN_PHONES?.split(',') || [];
    for (const phone of adminPhones) {
      await this.sendSms(phone, 'SMS_LOW_STOCK', {
        count: dishes.length,
        items: dishes.slice(0, 3).map(d => d.name).join(',')
      });
    }

    return { success: true, alerted: dishes.length };
  }

  async sendPushNotification(userId, title, content, data = {}) {
    logger.info(`推送通知: 用户${userId} -> ${title}`, { content });
    return { success: true };
  }
}

module.exports = new NotificationService();
