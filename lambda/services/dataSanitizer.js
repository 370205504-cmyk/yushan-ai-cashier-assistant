const crypto = require('crypto');

class DataSanitizer {
  static desensitize(data) {
    if (!data) {
      return data;
    }
    if (typeof data === 'string') {
      return this.desensitizeString(data);
    }
    if (typeof data === 'object') {
      const result = Array.isArray(data) ? [] : {};
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string' && this.isSensitiveField(key)) {
          result[key] = this.desensitizeString(value);
        } else if (typeof value === 'object') {
          result[key] = this.desensitize(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    }
    return data;
  }

  static isSensitiveField(key) {
    const sensitiveKeys = [
      'phone', 'mobile', 'tel', 'password', 'passwd', 'pwd',
      'secret', 'token', 'apiKey', 'apikey', 'paymentId',
      'creditCard', 'bankCard', 'idCard', 'idcard', 'certNo',
      'email', 'address', 'privateKey', 'publicKey'
    ];
    const lowerKey = key.toLowerCase();
    return sensitiveKeys.some(k => lowerKey.includes(k.toLowerCase()));
  }

  static desensitizeString(str) {
    if (!str) {
      return str;
    }
    str = String(str);

    if (/^\d{11}$/.test(str)) {
      return str.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    }

    if (/^\d{15}|\d{18}|\d{17}[\dXx]$/.test(str)) {
      return str.replace(/(\d{6})\d{8,11}(\d{4})/, '$1********$2');
    }

    if (str.length > 10) {
      const prefix = str.substring(0, 3);
      const suffix = str.substring(str.length - 4);
      return `${prefix}****${suffix}`;
    }

    return str;
  }

  static maskFileName(filename) {
    if (!filename) {
      return filename;
    }
    const name = String(filename);
    if (name.length > 20) {
      const ext = name.lastIndexOf('.') > 0 ? name.substring(name.lastIndexOf('.')) : '';
      const prefix = name.substring(0, 10);
      return `${prefix}****${ext}`;
    }
    return name;
  }
}

module.exports = DataSanitizer;
