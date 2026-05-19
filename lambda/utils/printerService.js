const config = require('../config.json');

class PrinterService {
  constructor() {
    const printerConfig = config.printer?.default || {};

    this.connected = false;
    this.printerModel = printerConfig.model || '爱普生 TM-T82X';
    this.printerIp = printerConfig.ip || '192.168.1.100';
    this.printerPort = printerConfig.port || 9100;
    this.printerStatus = 'ready';
    this.printQueue = [];
    this.inkLevel = '100%';
    this.paperLevel = '充足';
  }

  connectPrinter() {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.connected = true;
        this.printerStatus = 'ready';
        resolve({
          connected: true,
          printerModel: this.printerModel,
          printerIp: this.printerIp,
          printerPort: this.printerPort,
          status: this.printerStatus,
          message: '打印机连接成功'
        });
      }, 500);
    });
  }

  disconnectPrinter() {
    this.connected = false;
    this.printerStatus = 'offline';
    return {
      connected: false,
      message: '打印机已断开连接'
    };
  }

  checkPrinterStatus() {
    return {
      connected: this.connected,
      printerModel: this.printerModel,
      printerIp: this.printerIp,
      printerPort: this.printerPort,
      status: this.printerStatus,
      inkLevel: this.inkLevel,
      paperLevel: this.paperLevel,
      queueLength: this.printQueue.length
    };
  }

  printReceipt(order) {
    if (!this.connected) {
      return {
        success: false,
        error: '打印机未连接，请先连接打印机'
      };
    }

    const receipt = this.generateReceiptContent(order);

    return new Promise((resolve) => {
      setTimeout(() => {
        this.printQueue.push({
          type: 'receipt',
          content: receipt,
          timestamp: new Date().toISOString()
        });

        console.log('[Printer] 打印小票:', receipt);

        resolve({
          success: true,
          message: '小票已发送到打印机',
          receipt: receipt
        });
      }, 300);
    });
  }

  printMenu(dishes) {
    if (!this.connected) {
      return {
        success: false,
        error: '打印机未连接，请先连接打印机'
      };
    }

    const menu = this.generateMenuContent(dishes);

    return new Promise((resolve) => {
      setTimeout(() => {
        this.printQueue.push({
          type: 'menu',
          content: menu,
          timestamp: new Date().toISOString()
        });

        console.log('[Printer] 打印菜单:', menu);

        resolve({
          success: true,
          message: '菜单已发送到打印机',
          menu: menu
        });
      }, 500);
    });
  }

  printReservation(reservation) {
    if (!this.connected) {
      return {
        success: false,
        error: '打印机未连接，请先连接打印机'
      };
    }

    const content = this.generateReservationContent(reservation);

    return new Promise((resolve) => {
      setTimeout(() => {
        this.printQueue.push({
          type: 'reservation',
          content: content,
          timestamp: new Date().toISOString()
        });

        resolve({
          success: true,
          message: '预约单已发送到打印机',
          content: content
        });
      }, 300);
    });
  }

  generateReceiptContent(order) {
    const now = new Date();
    const restaurantName = config.restaurant?.name || '雨姗AI收银助手创味菜';
    const receipt = `
================================
     ${restaurantName}
================================
订单号：${order.orderId}
日期：${now.toLocaleDateString('zh-CN')}
时间：${now.toLocaleTimeString('zh-CN')}
--------------------------------
品名           数量    金额
--------------------------------
${order.dishName}        x${order.quantity}    ¥${order.subtotal}
--------------------------------
小计：¥${order.subtotal}
配送费：¥${order.deliveryFee}
--------------------------------
合计：¥${order.totalPrice}
--------------------------------
配送地址：${order.address}
--------------------------------
      谢谢光临，欢迎下次再来！
      开发者：石中伟
================================
    `;
    return receipt;
  }

  generateMenuContent(dishes) {
    const restaurantName = config.restaurant?.name || '雨姗AI收银助手创味菜';
    let menu = `
================================
     ${restaurantName} 菜单
================================
`;

    dishes.forEach((dish, index) => {
      menu += `${index + 1}. ${dish.name}    ¥${dish.price}\n`;
      menu += `   ${dish.taste} | ${dish.cuisine}\n\n`;
    });

    menu += `
================================
      开发者：石中伟
================================
    `;

    return menu;
  }

  generateReservationContent(reservation) {
    const restaurantName = config.restaurant?.name || '雨姗AI收银助手创味菜';
    const receipt = `
================================
     ${restaurantName}
================================
预约号：${reservation.reservationId}
日期：${reservation.date}
时间：${reservation.time}
人数：${reservation.personCount}人
门店：${reservation.storeName}
--------------------------------
      请按时到店出示本单
      开发者：石中伟
================================
    `;
    return receipt;
  }

  clearPrintQueue() {
    this.printQueue = [];
    return {
      success: true,
      message: '打印队列已清空'
    };
  }

  getPrintHistory() {
    return this.printQueue;
  }

  updatePrinterConfig(newConfig) {
    if (newConfig.model) {
      this.printerModel = newConfig.model;
    }
    if (newConfig.ip) {
      this.printerIp = newConfig.ip;
    }
    if (newConfig.port) {
      this.printerPort = newConfig.port;
    }
    return {
      success: true,
      message: '打印机配置已更新',
      config: {
        model: this.printerModel,
        ip: this.printerIp,
        port: this.printerPort
      }
    };
  }
}

module.exports = PrinterService;
