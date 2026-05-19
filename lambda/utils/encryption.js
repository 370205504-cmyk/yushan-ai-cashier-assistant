const crypto = require('crypto');

const algorithm = 'aes-256-cbc';

// 安全警告：生产环境必须修改默认密钥！
const defaultKey = 'yushan-ai-cashier-encryption-key-change-this-in-production!';
const isUsingDefaultKey = !process.env.ENCRYPTION_KEY;
const key = Buffer.from(process.env.ENCRYPTION_KEY || defaultKey, 'utf8').slice(0, 32);

if (isUsingDefaultKey) {
  console.warn('⚠️  【安全警告】使用默认加密密钥！生产环境请设置 ENCRYPTION_KEY 环境变量');
}

function encrypt(text) {
  if (!text) {
    return '';
  }
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedText) {
  if (!encryptedText) {
    return '';
  }
  const [ivHex, encryptedHex] = encryptedText.split(':');
  if (!ivHex || !encryptedHex) {
    return '';
  }
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function encryptPhone(phone) {
  return encrypt(phone);
}

function decryptPhone(encryptedPhone) {
  return decrypt(encryptedPhone);
}

function maskPhone(phone) {
  if (!phone) {
    return '';
  }
  const decrypted = decryptPhone(phone);
  if (decrypted.length === 11) {
    return `${decrypted.substring(0, 3)}****${decrypted.substring(7)}`;
  }
  return '****';
}

module.exports = {
  encrypt,
  decrypt,
  encryptPhone,
  decryptPhone,
  maskPhone
};