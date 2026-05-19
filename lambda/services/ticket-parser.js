/**
 * 小票解析器
 * 将打印的小票解析为结构化的订单数据
 */

class TicketParser {
  constructor() {
    this.patterns = {
      // 订单号
      orderNo: [
        /订单号[：:]\s*(\S+)/,
        /单号[：:]\s*(\S+)/,
        /Order\s*[#:]\s*(\S+)/i
      ],
      // 时间
      time: [
        /时间[：:]\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/,
        /日期[：:]\s*(\d{4}-\d{2}-\d{2})/
      ],
      // 总金额
      total: [
        /总计[：:]\s*[￥¥]?\s*([\d.]+)/,
        /实收[：:]\s*[￥¥]?\s*([\d.]+)/,
        /合计[：:]\s*[￥¥]?\s*([\d.]+)/,
        /Total[：:]\s*\$?\s*([\d.]+)/i
      ],
      // 商品行（通用）
      itemLine: /^(\d+)\.?\s*(\S.*?)\s*[×x]\s*(\d+)\s*[￥¥]?\s*([\d.]+)$/
    };
  }

  /**
   * 解析小票文本
   * @param {string} text 小票文本内容
   * @returns {Object} 解析后的订单数据
   */
  parse(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const result = {
      orderNo: null,
      time: null,
      items: [],
      total: 0,
      raw: text
    };

    // 提取订单号
    for (const pattern of this.patterns.orderNo) {
      const match = text.match(pattern);
      if (match) {
        result.orderNo = match[1];
        break;
      }
    }

    // 提取时间
    for (const pattern of this.patterns.time) {
      const match = text.match(pattern);
      if (match) {
        result.time = match[1];
        break;
      }
    }

    // 提取总金额
    for (const pattern of this.patterns.total) {
      const match = text.match(pattern);
      if (match) {
        result.total = parseFloat(match[1]) || 0;
        break;
      }
    }

    // 提取商品项
    let inItems = false;
    for (const line of lines) {
      // 简单的商品开始检测
      if (line.includes('名称') && line.includes('数量') && line.includes('金额')) {
        inItems = true;
        continue;
      }
      if (line.includes('---') || line.includes('总计') || line.includes('合计')) {
        inItems = false;
      }

      if (inItems) {
        const item = this.parseItemLine(line);
        if (item) {
          result.items.push(item);
        }
      }
    }

    return result;
  }

  /**
   * 解析单行商品
   */
  parseItemLine(line) {
    const match = line.match(this.patterns.itemLine);
    if (match) {
      return {
        no: parseInt(match[1]),
        name: match[2].trim(),
        quantity: parseInt(match[3]),
        price: parseFloat(match[4])
      };
    }

    // 简单的 fallback 解析
    const parts = line.split(/\s+/);
    if (parts.length >= 3) {
      const last = parts[parts.length - 1];
      const price = parseFloat(last);
      if (!isNaN(price)) {
        return {
          name: parts.slice(0, -1).join(' '),
          quantity: 1,
          price
        };
      }
    }
    return null;
  }
}

module.exports = TicketParser;
