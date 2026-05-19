const crypto = require('crypto');
const logger = require('../utils/logger');

const WECHAT_PAY_SECRET = process.env.WECHAT_PAY_KEY || '';

function signWechatPayParams(params, apiKey) {
  const sortedKeys = Object.keys(params).sort();
  const signString = sortedKeys
    .filter(key => params[key] !== undefined && params[key] !== '' && key !== 'sign')
    .map(key => `${key}=${params[key]}`)
    .join('&');

  const signWithKey = `${signString}&key=${apiKey}`;
  const md5Hash = crypto.createHash('md5').update(signWithKey, 'utf8').digest('hex');
  return md5Hash.toUpperCase();
}

function verifyWechatPaySign(params) {
  if (!params.sign) {
    logger.warn('微信支付回调缺少签名');
    return false;
  }

  const calculatedSign = signWechatPayParams(params, WECHAT_PAY_SECRET);
  const isValid = calculatedSign === params.sign.toUpperCase();

  if (!isValid) {
    logger.warn('微信支付签名验证失败', {
      expected: calculatedSign,
      received: params.sign
    });
  }

  return isValid;
}

function signWechatPayRequest(params, apiKey) {
  const sign = signWechatPayParams(params, apiKey);
  return { ...params, sign };
}

function parseWechatPayNotifyXml(xmlData) {
  const result = {};
  const keyValuePattern = /<([^>]+)><!\[CDATA\[([^\]]+)\]\]><\/[^>]+>/g;
  const simplePattern = /<([^>]+)>([^<]+)<\/[^>]+>/g;

  let match;

  while ((match = keyValuePattern.exec(xmlData)) !== null) {
    result[match[1]] = match[2];
  }

  while ((match = simplePattern.exec(xmlData)) !== null) {
    if (!result[match[1]]) {
      result[match[1]] = match[2];
    }
  }

  return result;
}

function buildWechatPayXml(params) {
  let xml = '<xml>';
  for (const [key, value] of Object.entries(params)) {
    const escapedValue = String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    xml += `<${key}><![CDATA[${escapedValue}]]></${key}>`;
  }
  xml += '</xml>';
  return xml;
}

module.exports = {
  signWechatPayParams,
  verifyWechatPaySign,
  signWechatPayRequest,
  parseWechatPayNotifyXml,
  buildWechatPayXml
};
