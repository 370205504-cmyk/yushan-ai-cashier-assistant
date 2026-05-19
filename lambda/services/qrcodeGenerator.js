/**
 * 二维码生成服务 v5.0.0
 * 店铺码、桌码自动生成，样式定制，打印模板
 */

const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

class QRCodeGeneratorService {
  constructor() {
    this.qrDir = path.join(__dirname, '..', 'public', 'qrcodes');
    this.init();
  }

  init() {
    if (!fs.existsSync(this.qrDir)) {
      fs.mkdirSync(this.qrDir, { recursive: true });
    }
  }

  /**
   * 生成店铺二维码
   */
  async generateStoreQRCode(storeInfo, options = {}) {
    const storeUrl = `${options.baseUrl || 'http://localhost:3000'}/?store=${encodeURIComponent(storeInfo.id || 'default')}`;
    
    const qrOptions = {
      width: options.width || 300,
      margin: 2,
      color: {
        dark: options.darkColor || '#000000',
        light: options.lightColor || '#FFFFFF'
      }
    };

    const qrImage = await QRCode.toDataURL(storeUrl, qrOptions);
    
    return {
      success: true,
      qrImage,
      storeUrl,
      storeInfo
    };
  }

  /**
   * 生成桌码二维码
   */
  async generateTableQRCode(tableNumber, storeInfo, options = {}) {
    const tableUrl = `${options.baseUrl || 'http://localhost:3000'}/?table=${encodeURIComponent(tableNumber)}&store=${encodeURIComponent(storeInfo.id || 'default')}`;
    
    const qrOptions = {
      width: options.width || 256,
      margin: 2,
      color: {
        dark: options.darkColor || '#000000',
        light: options.lightColor || '#FFFFFF'
      }
    };

    const qrImage = await QRCode.toDataURL(tableUrl, qrOptions);
    
    return {
      success: true,
      qrImage,
      tableUrl,
      tableNumber,
      storeInfo
    };
  }

  /**
   * 批量生成桌码
   */
  async batchGenerateTableQRCodes(tableCount, storeInfo, options = {}) {
    const qrcodes = [];
    
    for (let i = 1; i <= tableCount; i++) {
      const qr = await this.generateTableQRCode(i, storeInfo, options);
      qrcodes.push({
        tableNumber: i,
        qrImage: qr.qrImage,
        tableUrl: qr.tableUrl
      });
    }
    
    return {
      success: true,
      qrcodes,
      count: tableCount
    };
  }

  /**
   * 保存二维码到文件
   */
  async saveQRCodeToFile(qrDataUrl, filename) {
    const filepath = path.join(this.qrDir, filename);
    
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(filepath, base64Data, 'base64');
    
    return {
      success: true,
      filepath
    };
  }

  /**
   * 生成打印模板 HTML
   */
  generatePrintTemplate(qrcodes, storeInfo) {
    const qrItems = qrcodes.map(qr => `
      <div class="qr-item">
        <div class="qr-header">
          <h3>${storeInfo.name || '雨姗AI收银'}</h3>
        </div>
        <div class="qr-content">
          <img src="${qr.qrImage}" alt="桌码 ${qr.tableNumber}" />
        </div>
        <div class="qr-footer">
          <p class="table-number">${qr.tableNumber} 号桌</p>
          <p class="desc">扫码点餐</p>
        </div>
      </div>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${storeInfo.name || '雨姗AI收银'} - 桌码打印</title>
  <style>
    @page {
      size: A4;
      margin: 10mm;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: white;
    }
    .print-container {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      padding: 20px;
    }
    .qr-item {
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      break-inside: avoid;
    }
    .qr-header h3 {
      color: #667eea;
      font-size: 16px;
      margin-bottom: 10px;
    }
    .qr-content img {
      width: 180px;
      height: 180px;
    }
    .qr-footer {
      margin-top: 10px;
    }
    .table-number {
      font-size: 20px;
      font-weight: bold;
      color: #333;
    }
    .desc {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }
    @media print {
      .qr-item {
        border: 1px solid #ddd;
      }
    }
  </style>
</head>
<body>
  <div class="print-container">
    ${qrItems}
  </div>
</body>
</html>
    `;
  }

  /**
   * 生成店铺码打印模板
   */
  generateStorePrintTemplate(storeQR, storeInfo) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${storeInfo.name || '雨姗AI收银'} - 店铺码</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px;
    }
    .store-card {
      background: white;
      border-radius: 20px;
      padding: 40px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .store-card h1 {
      color: #667eea;
      font-size: 28px;
      margin-bottom: 20px;
    }
    .store-card p {
      color: #666;
      margin-bottom: 30px;
    }
    .qr-code img {
      width: 256px;
      height: 256px;
    }
    .tips {
      margin-top: 20px;
      color: #999;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="store-card">
    <h1>${storeInfo.name || '雨姗AI收银'}</h1>
    <p>扫码进入店铺</p>
    <div class="qr-code">
      <img src="${storeQR.qrImage}" alt="店铺码" />
    </div>
    <div class="tips">
      <p>地址：${storeInfo.address || ''}</p>
      <p>电话：${storeInfo.phone || ''}</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}

module.exports = new QRCodeGeneratorService();
