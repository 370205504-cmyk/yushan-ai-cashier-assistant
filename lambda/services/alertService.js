const winston = require('winston');
const nodemailer = require('nodemailer');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: 'logs/alerts.log', level: 'warn' }),
    new winston.transports.Console()
  ]
});

let transporter = null;

if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
}

const alertRecipients = process.env.ALERT_EMAILS?.split(',') || [];

async function sendAlert(subject, message, level = 'error') {
  logger.log(level, `[ALERT] ${subject}: ${message}`);

  if (!transporter || alertRecipients.length === 0) {
    return;
  }

  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || 'alerts@example.com',
      to: alertRecipients.join(','),
      subject: `[${level.toUpperCase()}] ${subject}`,
      text: message,
      html: `<p><strong>${subject}</strong></p><p>${message}</p><p>时间: ${new Date().toLocaleString('zh-CN')}</p>`
    };

    await transporter.sendMail(mailOptions);
    logger.info('告警邮件已发送');
  } catch (error) {
    logger.error('发送告警邮件失败:', error);
  }
}

async function checkHealth() {
  try {
    const db = require('../database/db');
    if (db.pool) {
      await db.pool.query('SELECT 1');
    }
  } catch (error) {
    await sendAlert('数据库连接失败', `数据库连接异常: ${error.message}`);
  }
}

function monitorError(error, context = '') {
  if (error.message && error.message.includes('printer')) {
    logger.warn('打印机异常:', error.message);
    return;
  }

  sendAlert('系统异常', `错误: ${error.message}\n上下文: ${context}\n堆栈: ${error.stack?.substring(0, 500)}`);
}

function monitorPerformance(endpoint, durationMs) {
  if (durationMs > 5000) {
    sendAlert('接口响应超时', `接口 ${endpoint} 响应时间: ${durationMs}ms`, 'warn');
  }
}

function monitorRateLimit(ip, endpoint) {
  sendAlert('请求频率超限', `IP: ${ip} 在 ${endpoint} 接口请求过于频繁`, 'warn');
}

function checkCertificateExpiry() {
  const certificateExpiry = process.env.WECHAT_CERT_EXPIRY;
  if (!certificateExpiry) {
    return;
  }

  const expiryDate = new Date(certificateExpiry);
  const daysRemaining = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 30) {
    sendAlert('证书即将过期', `微信支付证书将在${daysRemaining}天后过期，请及时更新`, 'warn');
  }
}

module.exports = {
  sendAlert,
  checkHealth,
  monitorError,
  monitorPerformance,
  monitorRateLimit,
  checkCertificateExpiry
};
