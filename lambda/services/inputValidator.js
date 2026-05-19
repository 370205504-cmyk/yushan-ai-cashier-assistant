const validator = require('validator');

class InputValidator {
  constructor() {
    this.maxLength = {
      name: 50,
      phone: 20,
      remark: 200,
      address: 255,
      searchQuery: 100,
      orderRemarks: 500
    };
  }

  sanitizeString(str) {
    if (typeof str !== 'string') {
      return '';
    }
    return validator.escape(validator.trim(str));
  }

  preventXSS(str) {
    if (!str || typeof str !== 'string') {
      return '';
    }
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  preventSQLInjection(str) {
    if (!str || typeof str !== 'string') {
      return '';
    }
    return str.replace(/['"\\;]/g, '');
  }

  validatePhone(phone) {
    if (!phone || typeof phone !== 'string') {
      return false;
    }
    return validator.isMobilePhone(phone, 'zh-CN');
  }

  validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }
    return validator.isEmail(email);
  }

  validateAmount(amount) {
    const num = parseFloat(amount);
    return !isNaN(num) && num >= 0 && num <= 999999;
  }

  validateQuantity(quantity) {
    const num = parseInt(quantity);
    return !isNaN(num) && num > 0 && num <= 999;
  }

  validateOrderRemarks(remarks) {
    if (!remarks) {
      return '';
    }
    const sanitized = String(remarks)
      .slice(0, this.maxLength.orderRemarks)
      .replace(/[<>]/g, '');
    return sanitized.trim();
  }

  validateSearchQuery(query) {
    if (!query || typeof query !== 'string') {
      return '';
    }
    return String(query)
      .slice(0, this.maxLength.searchQuery)
      .replace(/[<>\"\'\\]/g, '')
      .trim();
  }

  validateUserId(userId) {
    if (!userId) {
      return null;
    }
    if (typeof userId === 'string' && userId.match(/^u_[a-f0-9]{32}$/)) {
      return userId;
    }
    if (typeof userId === 'number' && userId > 0) {
      return userId;
    }
    return null;
  }

  validateOrderNo(orderNo) {
    if (!orderNo || typeof orderNo !== 'string') {
      return false;
    }
    return orderNo.match(/^ORD[A-Z0-9]{16,32}$/) !== null;
  }

  validateStatus(status, allowedStatuses) {
    if (!status || typeof status !== 'string') {
      return false;
    }
    return allowedStatuses.includes(status);
  }

  validateTableNo(tableNo) {
    if (!tableNo) {
      return null;
    }
    const sanitized = String(tableNo).slice(0, 20).replace(/[^a-zA-Z0-9\-_]/g, '');
    return sanitized || null;
  }

  validateAddress(address) {
    if (!address) {
      return null;
    }
    return String(address).slice(0, this.maxLength.address).trim();
  }

  sanitizeForDisplay(str) {
    if (!str || typeof str !== 'string') {
      return '';
    }
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  sanitizeForStorage(str) {
    if (!str || typeof str !== 'string') {
      return '';
    }
    return String(str)
      .replace(/\0/g, '')
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .slice(0, 1000);
  }

  validateCouponCode(code) {
    if (!code || typeof code !== 'string') {
      return null;
    }
    const sanitized = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
    return sanitized || null;
  }
}

module.exports = new InputValidator();
