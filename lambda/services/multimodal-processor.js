/**
 * 多模态交互处理器 v2.0
 * 支持文字、语音、图片识别（拍菜单点菜）
 * 老人、小孩都能轻松用，不用教
 */

class MultimodalProcessor {
  constructor() {
    this.supportedTypes = ['text', 'voice', 'image'];
    this.speechRecognition = null;
    this.imageRecognition = null;
  }

  /**
   * 处理任意格式的输入
   */
  async process(input, type = 'text', context = {}) {
    try {
      switch (type) {
        case 'voice':
          return await this.processVoice(input, context);
        case 'image':
          return await this.processImage(input, context);
        case 'text':
        default:
          return await this.processText(input, context);
      }
    } catch (e) {
      console.error('多模态处理失败:', e);
      return {
        success: false,
        type: 'error',
        reply: '处理失败，请换个方式再说一次~',
        suggestion: '可以试试直接打字或拍照'
      };
    }
  }

  /**
   * 处理文本输入
   */
  async processText(text, context = {}) {
    // 文本直接返回
    return {
      success: true,
      type: 'text',
      content: text,
      parsedIntent: this.parseNaturalLanguage(text),
      reply: null // 需要上层处理
    };
  }

  /**
   * 处理语音输入
   */
  async processVoice(audioData, context = {}) {
    try {
      // 1. 语音转文字（实际项目需要调用语音识别API，如百度/腾讯/阿里云）
      const text = await this.speechToText(audioData);
      
      if (!text) {
        return {
          success: false,
          type: 'voice',
          reply: '没听清楚您说的，请再说一遍好吗？',
          suggestion: '说话大声一点，靠近麦克风'
        };
      }

      // 2. 解析意图
      const parsedIntent = this.parseNaturalLanguage(text);

      return {
        success: true,
        type: 'voice',
        originalAudio: true,
        text,
        parsedIntent,
        reply: `好的，您说要"${text}"，我来帮您处理~`
      };
    } catch (e) {
      console.error('语音处理失败:', e);
      return {
        success: false,
        type: 'voice',
        reply: '语音识别出错了，请试试打字输入~',
        suggestion: '可以直接打字告诉我您想点什么'
      };
    }
  }

  /**
   * 语音转文字（模拟，实际需要接入真实API）
   */
  async speechToText(audioData) {
    // 这里是模拟，实际项目需要：
    // - 百度语音识别 API
    // - 腾讯云语音识别 ASR
    // - 阿里云语音识别
    // - 讯飞语音识别

    // 模拟：根据音频长度返回
    await new Promise(resolve => setTimeout(resolve, 500));

    // 模拟：返回识别结果
    const mockResults = [
      '宫保鸡丁一份',
      '来个两人份的套餐',
      '麻婆豆腐微辣',
      '红烧肉多少钱',
      '有wifi吗',
      '打包带走'
    ];

    return mockResults[Math.floor(Math.random() * mockResults.length)];
  }

  /**
   * 处理图片输入
   */
  async processImage(imageData, context = {}) {
    try {
      // 1. 图片识别（OCR识别菜单）
      const ocrResult = await this.recognizeMenu(imageData);

      if (!ocrResult || ocrResult.length === 0) {
        return {
          success: false,
          type: 'image',
          reply: '这张图片没能识别出菜品，请您告诉我菜名~',
          suggestion: '可以拍菜单或者直接告诉我菜名'
        };
      }

      // 2. 解析识别结果
      const dishes = this.parseOCRResult(ocrResult);

      return {
        success: true,
        type: 'image',
        recognizedDishes: dishes,
        reply: `识别到以下菜品：${dishes.map(d => d.name).join('、')}，请问都要吗？`,
        action: {
          type: 'add_to_cart',
          items: dishes
        }
      };
    } catch (e) {
      console.error('图片处理失败:', e);
      return {
        success: false,
        type: 'image',
        reply: '图片识别出错了，请试试直接告诉我菜名~',
        suggestion: '可以直接打字告诉我您想点什么'
      };
    }
  }

  /**
   * OCR识别菜单（模拟，实际需要接入真实OCR API）
   */
  async recognizeMenu(imageData) {
    // 这里是模拟，实际项目需要：
    // - 百度OCR
    // - 腾讯云OCR
    // - 阿里云OCR
    // - 讯飞OCR

    // 模拟：返回识别结果
    await new Promise(resolve => setTimeout(resolve, 800));

    const mockMenus = [
      [
        { text: '宫保鸡丁', confidence: 0.95, position: { x: 100, y: 50 } },
        { text: '28元', confidence: 0.90, position: { x: 200, y: 50 } },
        { text: '鱼香肉丝', confidence: 0.93, position: { x: 100, y: 100 } },
        { text: '26元', confidence: 0.88, position: { x: 200, y: 100 } },
        { text: '麻婆豆腐', confidence: 0.91, position: { x: 100, y: 150 } },
        { text: '18元', confidence: 0.87, position: { x: 200, y: 150 } }
      ],
      [
        { text: '红烧肉', confidence: 0.94, position: { x: 100, y: 50 } },
        { text: '38元', confidence: 0.89, position: { x: 200, y: 50 } },
        { text: '糖醋里脊', confidence: 0.92, position: { x: 100, y: 100 } },
        { text: '30元', confidence: 0.86, position: { x: 200, y: 100 } }
      ]
    ];

    return mockMenus[Math.floor(Math.random() * mockMenus.length)];
  }

  /**
   * 解析OCR结果，提取菜品和价格
   */
  parseOCRResult(ocrResult) {
    const dishes = [];
    let currentDish = null;

    for (const item of ocrResult) {
      const text = item.text.trim();
      const priceMatch = text.match(/(\d+)[元块]?/);

      if (priceMatch) {
        // 这可能是价格
        if (currentDish && !currentDish.price) {
          currentDish.price = parseInt(priceMatch[1]);
        }
      } else if (text.length >= 2 && !/^\d+$/.test(text)) {
        // 这可能是菜名
        if (currentDish && currentDish.price) {
          dishes.push(currentDish);
        }
        currentDish = {
          name: text,
          price: null,
          confidence: item.confidence
        };
      }
    }

    if (currentDish) {
      dishes.push(currentDish);
    }

    return dishes;
  }

  /**
   * 自然语言解析（意图识别）
   */
  parseNaturalLanguage(text) {
    const msg = text.toLowerCase();
    
    // 点餐意图
    const orderPatterns = [
      { pattern: /(?:来个?|点|要|给我|再来)(.+?)(?:一份|一个|一碗|一盘|两个?|三人)/i, type: 'ORDER_DISH', slot: 'quantity' },
      { pattern: /(?:跟|和)(?:上回|上次)(?:那个|那)?(.+)/i, type: 'REPEAT_ORDER', slot: 'previous' },
      { pattern: /(.+?)(\d+[份个碗盘])/i, type: 'ORDER_DISH', slot: 'quantity' }
    ];

    for (const { pattern, type, slot } of orderPatterns) {
      const match = msg.match(pattern);
      if (match) {
        return {
          type,
          intent: 'ORDER',
          confidence: 0.9,
          extracted: {
            dish: match[1] || match[2],
            quantity: slot === 'quantity' ? match[2] : null
          },
          originalText: text
        };
      }
    }

    // 询问意图
    if (/多少钱|价格|便宜/.test(msg)) {
      return {
        type: 'ASK_PRICE',
        intent: 'QUERY',
        confidence: 0.85,
        originalText: text
      };
    }

    // 推荐意图
    if (/推荐|招牌|最好吃|特色/.test(msg)) {
      return {
        type: 'ASK_RECOMMEND',
        intent: 'QUERY',
        confidence: 0.9,
        originalText: text
      };
    }

    // 确认意图
    if (/好|可以|行|要|点|来/.test(msg) && msg.length < 10) {
      return {
        type: 'CONFIRM',
        intent: 'CONFIRM',
        confidence: 0.7,
        originalText: text
      };
    }

    // 取消意图
    if (/不要|算了|取消|退/.test(msg)) {
      return {
        type: 'CANCEL',
        intent: 'CANCEL',
        confidence: 0.85,
        originalText: text
      };
    }

    return {
      type: 'UNKNOWN',
      intent: 'UNKNOWN',
      confidence: 0,
      originalText: text
    };
  }

  /**
   * 简化操作指引（老人/小孩友好）
   */
  getSimpleModeGuide() {
    return {
      voice: {
        title: '🎤 语音点餐',
        steps: [
          '1. 点击麦克风按钮',
          '2. 对着手机说菜名',
          '3. 例如："宫保鸡丁一份"'
        ],
        examples: [
          '"宫保鸡丁"',
          '"来个套餐"',
          '"再加一碗米饭"'
        ]
      },
      image: {
        title: '📷 拍照点餐',
        steps: [
          '1. 拍下菜单照片',
          '2. 上传图片',
          '3. AI自动识别菜品',
          '4. 确认下单'
        ],
        tips: '拍摄时保持光线充足，菜单平整'
      },
      text: {
        title: '⌨️ 打字点餐',
        steps: [
          '1. 直接输入菜名',
          '2. 例如："宫保鸡丁"'
        ],
        examples: [
          '"宫保鸡丁"',
          '"套餐"',
          '"有什么推荐"'
        ]
      }
    };
  }

  /**
   * 生成老人友好的大字体回复
   */
  formatForElderly(text, recommendations = []) {
    let formatted = `

═══════════════════════════════════════
${text}
═══════════════════════════════════════

`;

    if (recommendations.length > 0) {
      formatted += '\n推荐菜品：\n';
      recommendations.forEach((dish, idx) => {
        formatted += `\n  ${idx + 1}. ${dish.name}\n     价格：${dish.price}元\n`;
      });
    }

    formatted += `

═══════════════════════════════════════

回复数字选择，或直接说话/打字~

`;

    return formatted;
  }

  /**
   * 获取支持的多模态类型
   */
  getSupportedTypes() {
    return {
      text: {
        supported: true,
        description: '直接打字输入'
      },
      voice: {
        supported: true,
        description: '语音输入，说出菜名即可',
        requiresMicrophone: true
      },
      image: {
        supported: true,
        description: '拍照上传菜单，AI自动识别',
        requiresCamera: true
      }
    };
  }
}

module.exports = MultimodalProcessor;
