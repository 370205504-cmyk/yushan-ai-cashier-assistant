/**
 * 企业微信机器人对接 - 扣子平台集成
 */

const crypto = require('crypto');
const MCPHandler = require('../mcp/handler');
const AIAgent = require('../services/ai-agent');
const ContextManager = require('../mcp/context');

class WeWorkBot {
  constructor() {
    this.handler = new MCPHandler();
    this.agent = new AIAgent();
    this.context = new ContextManager();
    this.subscribers = new Set();
    this.token = process.env.WW_WORK_TOKEN || '';
    this.encodingAesKey = process.env.WW_WORK_ENCODING_AES_KEY || '';
    this.appId = process.env.WW_WORK_APPID || '';
  }

  /**
   * 验证企业微信消息签名
   */
  verifySignature(signature, timestamp, nonce, encrypt) {
    if (!this.token || !this.encodingAesKey) {
      console.warn('企业微信签名验证配置不完整，跳过签名验证');
      return true;
    }

    const sortArr = [this.token, timestamp, nonce, encrypt].sort();
    const signatureStr = sortArr.join('');
    const expectedSignature = crypto
      .createHash('sha1')
      .update(signatureStr)
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * 解密企业微信消息
   */
  decryptMessage(encrypt) {
    if (!this.encodingAesKey) {
      return null;
    }

    try {
      const aesKey = Buffer.from(this.encodingAesKey + '=', 'base64');
      const iv = aesKey.slice(0, 16);

      const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
      decipher.setAutoPadding(false);

      let decrypted = Buffer.concat([
        decipher.update(Buffer.from(encrypt, 'base64')),
        decipher.final()
      ]);

      const msgLen = decrypted.readUInt32BE(decrypted.length - 4);
      const msgContent = decrypted.slice(20, 20 + msgLen);

      return msgContent.toString('utf8');
    } catch (error) {
      console.error('消息解密失败:', error);
      return null;
    }
  }

  /**
   * 验证回调URL（用于企业微信配置验证）
   */
  verifyCallbackURL(msgSignature, timestamp, nonce, echostr) {
    if (!this.verifySignature(msgSignature, timestamp, nonce, echostr)) {
      return null;
    }

    return this.decryptMessage(echostr);
  }

  /**
   * 处理好友添加
   */
  async handleFriendAdd(userId, userInfo) {
    console.log(`新好友添加: ${userId}`);
    const welcome = this.agent.getWelcomeMessage({ isReturning: false });
    return {
      type: 'text',
      content: `${welcome}\n\n发送菜单可查看菜品，直接说菜名即可点餐！`
    };
  }

  /**
   * 处理私聊消息
   */
  async handlePrivateMessage(userId, message) {
    console.log(`收到用户 ${userId} 消息: ${message}`);
    
    const sessionId = `wework_${userId}`;
    const customerId = userId;
    
    // 语音消息处理（简化版）
    if (message.type === 'voice') {
      // 这里应该调用语音转文字API
      message.text = this.simulateVoiceToText(message);
    }
    
    const result = await this.handler.handleMessage(sessionId, customerId, message.text || message);
    
    // 如果订单成功，订阅状态推送
    if (result.type === 'order_confirmed') {
      this.subscribers.add(userId);
    }
    
    return this.formatWeWorkMessage(result);
  }

  /**
   * 模拟语音转文字
   */
  simulateVoiceToText(voiceMessage) {
    // 实际项目这里应该调用真实的语音识别API
    return '宫保鸡丁一份';
  }

  /**
   * 推送订单状态
   */
  async pushOrderStatus(userId, orderNo, status) {
    const statusMessage = this.agent.getOrderStatusUpdate(status);
    return {
      type: 'text',
      content: `订单 ${orderNo} 更新：${statusMessage}`
    };
  }

  /**
   * 格式化为企业微信消息格式
   */
  formatWeWorkMessage(result) {
    switch (result.type) {
      case 'text':
        return {
          msgtype: 'text',
          text: { content: result.reply }
        };
      
      case 'menu':
        return {
          msgtype: 'news',
          news: {
            articles: [
              {
                title: '今日推荐',
                description: result.reply,
                url: 'https://example.com/menu',
                picurl: 'https://example.com/menu.jpg'
              }
            ]
          }
        };
      
      case 'cart_view':
      case 'cart_updated':
        return {
          msgtype: 'text',
          text: { content: result.reply }
        };
      
      case 'order_confirmed':
        return {
          msgtype: 'text',
          text: { content: result.reply }
        };
      
      case 'transfer_human':
        return {
          msgtype: 'news',
          news: {
            articles: [
              {
                title: '人工客服',
                description: result.reply,
                url: result.qrcode,
                picurl: result.qrcode
              }
            ]
          }
        };
      
      default:
        return {
          msgtype: 'text',
          text: { content: result.reply || '抱歉，系统出错了！' }
        };
    }
  }

  /**
   * 处理扣子平台的回调（带签名验证）
   */
  async handleKouZiCallback(callbackData) {
    const { msg_signature, timestamp, nonce, encrypt, type, userId, message } = callbackData;

    if (encrypt) {
      if (!this.verifySignature(msg_signature, timestamp, nonce, encrypt)) {
        console.error('企业微信消息签名验证失败');
        return null;
      }

      const decryptedXml = this.decryptMessage(encrypt);
      if (!decryptedXml) {
        console.error('企业微信消息解密失败');
        return null;
      }

      const parsed = this.parseXmlMessage(decryptedXml);
      return this.handleKouZiCallback(parsed);
    }

    switch (type) {
      case 'friend_add':
        return await this.handleFriendAdd(userId, message);

      case 'private_message':
        return await this.handlePrivateMessage(userId, message);

      default:
        console.log('未知回调类型:', type);
        return null;
    }
  }

  /**
   * 解析企业微信XML消息
   */
  parseXmlMessage(xml) {
    const result = {};
    const pattern = /<(\w+)><!\[CDATA\[([^\]]*)\]\]><\/\1>|<(\w+)>([^<]*)<\/\3>/g;
    let match;

    while ((match = pattern.exec(xml)) !== null) {
      const key = match[1] || match[3];
      const value = match[2] || match[4];
      result[key] = value;
    }

    return result;
  }
}

module.exports = WeWorkBot;
