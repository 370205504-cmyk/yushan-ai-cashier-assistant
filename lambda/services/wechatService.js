const axios = require('axios');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.File({ filename: 'logs/wechat.log' })]
});

class WechatService {
  constructor() {
    this.appId = process.env.WECHAT_APPID;
    this.appSecret = process.env.WECHAT_SECRET;
    this.mchId = process.env.WECHAT_MCHID;
    this.apiKey = process.env.WECHAT_APIKEY;
    this.redirectUri = process.env.WECHAT_REDIRECT_URI || 'https://mcp.yushan-ai-cashier.com/api/v1/auth/wechat/callback';
    this.unifiedOrderUrl = 'https://api.mch.weixin.qq.com/pay/unifiedorder';
    this.accessTokenUrl = 'https://api.weixin.qq.com/cgi-bin/token';
    this.userInfoUrl = 'https://api.weixin.qq.com/cgi-bin/user/info';
    this.authorizeUrl = 'https://open.weixin.qq.com/connect/oauth2/authorize';
  }

  getAuthorizeUrl(state = '') {
    const params = new URLSearchParams({
      appid: this.appId,
      redirect_uri: encodeURIComponent(this.redirectUri),
      response_type: 'code',
      scope: 'snsapi_userinfo',
      state: state || 'web'
    });
    return `${this.authorizeUrl}?${params.toString()}#wechat_redirect`;
  }

  async getAccessToken(code) {
    try {
      const params = new URLSearchParams({
        appid: this.appId,
        secret: this.appSecret,
        code,
        grant_type: 'authorization_code'
      });

      const response = await axios.get(`${this.accessTokenUrl}?${params.toString()}`);
      const data = response.data;

      if (data.errcode) {
        logger.error('获取access_token失败:', data);
        return { success: false, message: data.errmsg };
      }

      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        openid: data.openid,
        expiresIn: data.expires_in
      };
    } catch (error) {
      logger.error('获取access_token异常:', error.message);
      return { success: false, message: '获取授权失败' };
    }
  }

  async getUserInfo(accessToken, openid) {
    try {
      const params = new URLSearchParams({
        access_token: accessToken,
        openid,
        lang: 'zh_CN'
      });

      const response = await axios.get(`${this.userInfoUrl}?${params.toString()}`);
      const data = response.data;

      if (data.errcode && data.errcode !== 40003) {
        return { success: false, message: data.errmsg };
      }

      return {
        success: true,
        userInfo: {
          openid: data.openid,
          nickname: data.nickname,
          sex: data.sex,
          province: data.province,
          city: data.city,
          country: data.country,
          headimgurl: data.headimgurl,
          privilege: data.privilege,
          unionid: data.unionid
        }
      };
    } catch (error) {
      logger.error('获取用户信息异常:', error.message);
      return { success: false, message: '获取用户信息失败' };
    }
  }

  async createPayOrder(order) {
    try {
      const nonceStr = Math.random().toString(36).substring(2, 15);
      const timeStamp = Math.floor(Date.now() / 1000).toString();

      const params = {
        appid: this.appId,
        mch_id: this.mchId,
        nonce_str: nonceStr,
        sign_type: 'MD5',
        body: `雨姗AI收银助手-${order.orderNo}`,
        out_trade_no: order.orderNo,
        total_fee: Math.round(order.amount * 100),
        spbill_create_ip: order.clientIp || '127.0.0.1',
        notify_url: process.env.WECHAT_PAY_NOTIFY_URL,
        trade_type: 'NATIVE',
        product_id: order.orderNo
      };

      const sign = this.signParams(params);
      params.sign = sign;

      const xml = this.buildXml(params);

      const response = await axios.post(this.unifiedOrderUrl, xml, {
        headers: { 'Content-Type': 'text/xml' }
      });

      const result = this.parseXml(response.data);

      if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
        return {
          success: true,
          codeUrl: result.code_url,
          prepayId: result.prepay_id,
          timeStamp,
          nonceStr,
          orderNo: order.orderNo
        };
      } else {
        logger.error('创建支付订单失败:', result);
        return { success: false, message: result.err_code_des || '创建支付失败' };
      }
    } catch (error) {
      logger.error('创建支付订单异常:', error.message);
      return { success: false, message: '创建支付失败' };
    }
  }

  async handleNotify(data) {
    try {
      if (data.return_code !== 'SUCCESS') {
        return { success: false, message: data.return_msg };
      }

      const sign = data.sign;
      delete data.sign;
      const verifySign = this.signParams(data);

      if (sign !== verifySign) {
        logger.warn('微信支付回调签名验证失败');
        return { success: false, message: '签名验证失败' };
      }

      await db.transaction(async (connection) => {
        await connection.query(
          'UPDATE orders SET payment_status = ?, payment_no = ?, status = ?, paid_at = NOW() WHERE order_no = ?',
          ['paid', data.transaction_id, 'confirmed', data.out_trade_no]
        );
      });

      logger.info(`微信支付成功: ${data.out_trade_no}`);
      return { success: true, message: 'OK' };
    } catch (error) {
      logger.error('处理微信回调异常:', error.message);
      return { success: false, message: '处理失败' };
    }
  }

  async sendTemplateMessage(openid, templateId, data) {
    try {
      const accessToken = await this.getAccessTokenFromCache();
      const url = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`;

      const message = {
        touser: openid,
        template_id: templateId,
        url: data.url || '',
        data: data.items
      };

      const response = await axios.post(url, message);
      const result = response.data;

      if (result.errcode === 0) {
        logger.info(`模板消息发送成功: ${openid}`);
        return { success: true, msgid: result.msgid };
      } else {
        logger.error('模板消息发送失败:', result);
        return { success: false, message: result.errmsg };
      }
    } catch (error) {
      logger.error('发送模板消息异常:', error.message);
      return { success: false, message: '发送失败' };
    }
  }

  async getAccessTokenFromCache() {
    const cacheKey = 'wechat:access_token';
    const cached = await db.cacheGet(cacheKey);
    if (cached) {
      return cached;
    }

    const params = new URLSearchParams({
      grant_type: 'client_credential',
      appid: this.appId,
      secret: this.appSecret
    });

    const response = await axios.get(`${this.accessTokenUrl}?${params.toString()}`);
    const data = response.data;

    if (data.access_token) {
      await db.cacheSet(cacheKey, data.access_token, 7000);
      return data.access_token;
    }

    throw new Error('获取access_token失败');
  }

  signParams(params) {
    const sortedKeys = Object.keys(params).sort();
    const signStr = `${sortedKeys.map(key => `${key}=${params[key]}`).join('&') }&key=${this.apiKey}`;
    return require('crypto').createHash('md5').update(signStr, 'utf8').digest('hex').toUpperCase();
  }

  buildXml(params) {
    let xml = '<xml>';
    for (const [key, value] of Object.entries(params)) {
      xml += `<${key}><![CDATA[${value}]]></${key}>`;
    }
    xml += '</xml>';
    return xml;
  }

  parseXml(xmlStr) {
    const result = {};
    const regex = /<(\w+)>(<!\[CDATA\[)?([^\]]+?)(\]\]>)?<\/\1>/g;
    let match;
    while ((match = regex.exec(xmlStr)) !== null) {
      result[match[1]] = match[3];
    }
    return result;
  }
}

module.exports = new WechatService();
