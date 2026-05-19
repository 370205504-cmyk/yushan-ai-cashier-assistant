class SelfOrderService {
  constructor() {
    this.baseUrl = 'https://yushan-ai-cashier.example.com/self-order';
    this.qrCodeExpiration = 300; // 5分钟有效期
  }

  generateStoreOrderQRCode(storeId) {
    const timestamp = Date.now();
    const token = this.generateToken(storeId, timestamp);

    return {
      type: 'order',
      storeId: storeId,
      url: `${this.baseUrl}/order?store=${storeId}&t=${timestamp}&token=${token}`,
      qrCodeData: `STORE:${storeId}:ORDER:${timestamp}:${token}`,
      expiresAt: new Date(timestamp + this.qrCodeExpiration * 1000).toISOString()
    };
  }

  generateMenuQRCode(storeId) {
    const timestamp = Date.now();
    const token = this.generateToken(storeId, timestamp);

    return {
      type: 'menu',
      storeId: storeId,
      url: `${this.baseUrl}/menu?store=${storeId}&t=${timestamp}&token=${token}`,
      qrCodeData: `STORE:${storeId}:MENU:${timestamp}:${token}`,
      expiresAt: new Date(timestamp + this.qrCodeExpiration * 1000).toISOString()
    };
  }

  generateTableQRCode(storeId, tableNumber) {
    const timestamp = Date.now();
    const token = this.generateToken(`${storeId}:${tableNumber}`, timestamp);

    return {
      type: 'table',
      storeId: storeId,
      tableNumber: tableNumber,
      url: `${this.baseUrl}/table?store=${storeId}&table=${tableNumber}&t=${timestamp}&token=${token}`,
      qrCodeData: `STORE:${storeId}:TABLE:${tableNumber}:${timestamp}:${token}`,
      expiresAt: new Date(timestamp + this.qrCodeExpiration * 1000).toISOString()
    };
  }

  generateToken(storeId, timestamp) {
    const data = `${storeId}:${timestamp}:雨姗AI收银助手创味菜`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).toUpperCase();
  }

  createSelfOrder(storeId, tableNumber, items) {
    const orderId = this.generateOrderId();

    return {
      orderId: orderId,
      storeId: storeId,
      tableNumber: tableNumber,
      items: items,
      status: 'pending',
      createdAt: new Date().toISOString(),
      totalAmount: items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    };
  }

  generateOrderId() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SD${dateStr}${random}`;
  }

  validateQRCode(qrCodeData) {
    try {
      const parts = qrCodeData.split(':');
      if (parts.length < 4) {
        return { valid: false, error: '无效的二维码' };
      }

      const storeId = parts[1];
      const timestamp = parseInt(parts[3]);
      const now = Date.now();

      if (now - timestamp > this.qrCodeExpiration * 1000) {
        return { valid: false, error: '二维码已过期，请重新生成' };
      }

      return {
        valid: true,
        storeId: storeId,
        type: parts[2],
        timestamp: timestamp
      };
    } catch (error) {
      return { valid: false, error: '二维码解析失败' };
    }
  }

  getSelfOrderPage(storeId, type) {
    const urls = {
      order: `${this.baseUrl}/order?store=${storeId}`,
      menu: `${this.baseUrl}/menu?store=${storeId}`,
      payment: `${this.baseUrl}/payment?store=${storeId}`
    };

    return urls[type] || urls.order;
  }
}

module.exports = SelfOrderService;
