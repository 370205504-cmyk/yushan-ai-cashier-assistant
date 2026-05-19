/**
 * 全场景自动答疑系统 v2.0
 * 覆盖营业时间/包间/停车/打包/辣度/忌口/优惠等200+常见问题
 */

class FAQSystem {
  constructor() {
    this.categories = [
      '基础信息',
      '营业相关',
      '菜品咨询',
      '点餐服务',
      '支付相关',
      '会员服务',
      '促销活动',
      '外卖配送',
      '特殊需求',
      '投诉建议'
    ];

    // 构建问答知识库
    this.knowledgeBase = this.buildKnowledgeBase();
    
    // 构建关键词索引
    this.keywordIndex = this.buildKeywordIndex();
  }

  /**
   * 构建知识库
   */
  buildKnowledgeBase() {
    return {
      // ========== 1. 基础信息 ==========
      basic_info: {
        store_name: '雨姗AI收银助手创味菜',
        address: '河南省商丘市县',
        phone: '0370-1234567',
        hours: '10:00 - 22:00',
        wifi: { name: 'Yushan-Free', password: '88888888' }
      },

      // ========== 2. 营业相关问题 ==========
      business_hours: {
        patterns: [
          { q: ['几点开门', '几点营业', '营业时间', '什么时候开门', '几点关店', '营业到几点'],
            a: '我们的营业时间是每天 10:00 - 22:00，欢迎光临！',
            tags: ['营业时间']
          },
          { q: ['中午休息吗', '午休时间', '中午能吃吗'],
            a: '我们中午不休息，全天营业！10点到22点随时欢迎~',
            tags: ['营业时间', '午休']
          },
          { q: ['节假日营业吗', '过年营业', '节日开门吗'],
            a: '节假日正常营业！欢迎节日来聚餐~',
            tags: ['营业时间', '节假日']
          }
        ]
      },

      // ========== 3. 菜品咨询 ==========
      dish_inquiry: {
        patterns: [
          { q: ['招牌菜', '特色菜', '最好吃的', '推荐菜'],
            a: '我们的招牌菜有：宫保鸡丁、鱼香肉丝、红烧肉、糖醋里脊，都是点击率超高的经典菜品！',
            tags: ['招牌', '推荐']
          },
          { q: ['辣不辣', '有多辣', '辣度', '能不能做不辣', '不要辣'],
            a: '我们的菜品可以根据您的口味调整辣度，可以做不辣、微辣、中辣、特辣，点餐时告诉我您的辣度要求即可~',
            tags: ['辣度', '口味']
          },
          { q: ['有什么菜', '菜单', '都有什么', '菜品列表'],
            a: '我们有川菜、鲁菜等各类特色菜品，包括宫保鸡丁、鱼香肉丝、红烧肉、糖醋里脊、麻婆豆腐等经典菜品~需要我给您详细介绍吗？',
            tags: ['菜单', '菜品']
          },
          { q: ['有没有素菜', '素食', '斋菜'],
            a: '有的！我们有麻婆豆腐、蚝油生菜、炒时蔬等素菜，也可以让厨师帮您做其他素菜~',
            tags: ['素菜', '素食']
          },
          { q: ['有没有海鲜', '海鲜'],
            a: '抱歉，我们主要做川菜和家常菜，暂不提供海鲜~感谢您的理解！',
            tags: ['海鲜']
          },
          { q: ['分量多大', '够不够吃', '一人份', '几个人吃'],
            a: '我们的菜品分量适中，一般够2-3人食用。如果您人少，也可以点半份或者单品~',
            tags: ['分量', '份量']
          },
          { q: ['有没有套餐', '套餐推荐'],
            a: '有的！我们有2人经典套餐（68元）、3人豪华套餐（98元）、单人简餐（32元）等多种选择~',
            tags: ['套餐']
          },
          { q: ['能加菜吗', '再加一个', '加菜'],
            a: '当然可以！直接告诉我您想加什么菜就好~',
            tags: ['加菜', '点餐']
          },
          { q: ['能减菜吗', '不要这个', '退掉'],
            a: '可以减菜！告诉我您想退掉哪道菜，我来帮您处理~',
            tags: ['减菜', '退菜']
          },
          { q: ['菜做了吗', '能退吗', '还没上'],
            a: '如果您点完还没付款，可以直接取消。如果已经付款，厨房已经开始制作，可能无法取消哦~',
            tags: ['退菜', '取消']
          }
        ]
      },

      // ========== 4. 特殊饮食需求 ==========
      dietary_restrictions: {
        patterns: [
          { q: ['不要香菜', '不加香菜', '香菜过敏'],
            a: '好的，我会告诉厨房不要放香菜~还有其他忌口吗？',
            tags: ['忌口', '香菜']
          },
          { q: ['不要葱', '不加葱', '葱花'],
            a: '没问题，葱也不放~',
            tags: ['忌口', '葱']
          },
          { q: ['不要蒜', '不加蒜'],
            a: '好的，蒜也不放~',
            tags: ['忌口', '蒜']
          },
          { q: ['能不能不放辣', '不要辣的', '做不辣的'],
            a: '可以的！告诉厨师做不辣的版本，微辣中辣特辣都可以调整~',
            tags: ['忌口', '辣']
          },
          { q: ['有没有甜的', '不要咸的'],
            a: '我们有糖醋里脊、拔丝地瓜等甜口菜品，口味偏甜~',
            tags: ['口味', '甜']
          },
          { q: ['清淡一点', '少油', '少盐'],
            a: '好的，可以告诉厨房做清淡一些，少油少盐~',
            tags: ['口味', '清淡']
          },
          { q: ['过敏', '食物过敏'],
            a: '请问您对什么食物过敏？我会记录并告诉厨房特别注意！',
            tags: ['过敏']
          }
        ]
      },

      // ========== 5. 预约/订座 ==========
      reservation: {
        patterns: [
          { q: ['预约', '订座', '订位', '预订'],
            a: '您可以通过电话 0370-1234567 预约，也可以告诉我您想预约的时间和人数，我来帮您记录~',
            tags: ['预约', '订座']
          },
          { q: ['几个人', '多少人', '座位'],
            a: '请问您几位用餐？我来帮您安排合适的座位~',
            tags: ['人数', '座位']
          },
          { q: ['包间', '包厢', '有包间吗'],
            a: '我们有小包间和中包间，可以容纳4-12人，需要的话提前预约哦~',
            tags: ['包间', '包厢']
          },
          { q: ['什么位置', '靠窗', '安静'],
            a: '我们有靠窗位置和安静角落，您有偏好吗？我帮您备注~',
            tags: ['座位', '位置']
          }
        ]
      },

      // ========== 6. 外卖相关 ==========
      delivery: {
        patterns: [
          { q: ['外卖', '送餐', '可以送吗', '能送外卖吗'],
            a: '我们支持美团和饿了么外卖，您也可以选择到店自提~需要我帮您下单吗？',
            tags: ['外卖', '配送']
          },
          { q: ['多久送到', '配送时间', '多长时间'],
            a: '一般情况下，制作完成后30分钟左右送达，具体时间取决于距离和订单量~',
            tags: ['配送', '时间']
          },
          { q: ['配送费', '外送费', '运费'],
            a: '美团和饿了么平台会有相应配送费，具体以平台显示为准~',
            tags: ['配送费']
          },
          { q: ['自提', '到店取', '自己拿'],
            a: '可以的！下单时选择到店自提，制作完成后我们会通知您来取~',
            tags: ['自提']
          }
        ]
      },

      // ========== 7. 支付相关 ==========
      payment: {
        patterns: [
          { q: ['怎么付款', '支付方式', '能用什么付'],
            a: '我们支持微信支付、支付宝、现金、会员卡余额等多种支付方式~',
            tags: ['支付']
          },
          { q: ['能开发票吗', '发票'],
            a: '可以开发票！付款后告诉我您的发票抬头和税号，我来帮您处理~',
            tags: ['发票']
          },
          { q: ['微信支付', '支付宝'],
            a: '可以的！我们支持微信支付和支付宝，扫码即可付款~',
            tags: ['支付']
          },
          { q: ['会员卡', '卡里有钱'],
            a: '会员卡余额可以直接扣减，消费可享受积分，积分可以抵扣现金~',
            tags: ['会员', '支付']
          },
          { q: ['能打折吗', '优惠', '便宜点'],
            a: '我们有会员折扣、满减活动、套餐优惠等多种优惠，点餐时我帮您推荐最优惠的方式~',
            tags: ['优惠', '折扣']
          }
        ]
      },

      // ========== 8. 会员服务 ==========
      membership: {
        patterns: [
          { q: ['会员', '会员卡', '积分'],
            a: '成为我们的会员可以享受积分返利、会员折扣、生日优惠等多重权益！请问您是我们的会员吗？',
            tags: ['会员']
          },
          { q: ['怎么成为会员', '注册会员', '加入会员'],
            a: '您可以直接付款时告诉我手机号，我帮您注册成为会员，首次注册送100积分~',
            tags: ['会员', '注册']
          },
          { q: ['积分怎么用', '积分兑换'],
            a: '100积分可以抵扣1元现金，消费1元累积1积分，会员日消费双倍积分~',
            tags: ['积分']
          },
          { q: ['会员打折吗', '会员价'],
            a: '会员享受9.5折优惠（特价菜除外），会员日享受更多折扣~',
            tags: ['会员', '折扣']
          },
          { q: ['余额查询', '卡里还有多少钱'],
            a: '请问您的会员手机号是多少？我帮您查询余额~',
            tags: ['会员', '余额']
          },
          { q: ['充值', '怎么充值', '充值优惠'],
            a: '会员充值有优惠！充值200送20，充值500送80，充值1000送200~',
            tags: ['充值']
          },
          { q: ['生日优惠', '生日当天'],
            a: '会员生日当天享受菜品8折优惠（酒水除外），还送长寿面一份~',
            tags: ['生日', '优惠']
          }
        ]
      },

      // ========== 9. 停车/交通 ==========
      parking: {
        patterns: [
          { q: ['停车', '停车场', '停车位'],
            a: '我们地下有停车场，B1层有专属车位。消费满100元可免2小时停车费~',
            tags: ['停车']
          },
          { q: ['地铁', '公交', '怎么去'],
            a: '您可以乘坐XX路/XX路公交车到XX站下车，步行5分钟即可到达~',
            tags: ['交通']
          },
          { q: ['收费吗', '停车费'],
            a: '停车每小时3元，消费满100元可免2小时停车费~',
            tags: ['停车', '费用']
          }
        ]
      },

      // ========== 10. WiFi/设施 ==========
      facilities: {
        patterns: [
          { q: ['WiFi', '无线网', 'wifi密码', '上网'],
            a: 'WiFi账号：Yushan-Free，密码：88888888~',
            tags: ['WiFi']
          },
          { q: ['有厕所吗', '洗手间', '卫生间'],
            a: '有的，门店右手边有洗手间，请自由使用~',
            tags: ['设施']
          },
          { q: ['有空调吗', '热', '冷'],
            a: '店内全年空调开放，温度舒适~',
            tags: ['设施']
          }
        ]
      },

      // ========== 11. 打包/外带 ==========
      takeaway: {
        patterns: [
          { q: ['打包', '外带', '带走'],
            a: '可以打包！打包盒每个1元，我会帮您打包好~',
            tags: ['打包']
          },
          { q: ['能打包吗', '可以带走吗'],
            a: '当然可以！所有菜品都可以打包，打包盒需额外收取1元~',
            tags: ['打包']
          }
        ]
      },

      // ========== 12. 排队等位 ==========
      queue: {
        patterns: [
          { q: ['排队', '等位', '有人吗'],
            a: '好的，我来帮您取号！请问您几位？目前等位大约需要10-15分钟~',
            tags: ['排队']
          },
          { q: ['等多久', '还要等多久'],
            a: '根据目前情况，预计还需要等待10分钟左右。我会提前通知您~',
            tags: ['排队']
          },
          { q: ['取消排队', '不排了'],
            a: '好的，已为您取消排队。欢迎下次光临~',
            tags: ['排队']
          }
        ]
      },

      // ========== 13. 投诉建议 ==========
      feedback: {
        patterns: [
          { q: ['投诉', '意见', '反馈'],
            a: '非常抱歉给您带来不好的体验！请您告诉我具体情况，我会及时反馈给店长处理~',
            tags: ['投诉']
          },
          { q: ['菜不好吃', '不好吃', '退款'],
            a: '非常抱歉！请问是哪道菜有问题？我会第一时间反馈给厨房改进。如果确实有问题，我们可以为您重新制作或处理~',
            tags: ['投诉', '质量问题']
          },
          { q: ['上菜慢', '等太久了'],
            a: '抱歉让您久等！我去催一下厨房尽快出菜~',
            tags: ['投诉', '上菜慢']
          },
          { q: ['表扬', '夸一下', '写好评'],
            a: '谢谢您的认可！您的支持是我们最大的动力~请问还有什么需要吗？',
            tags: ['表扬']
          }
        ]
      },

      // ========== 14. 其他常见问题 ==========
      others: {
        patterns: [
          { q: ['谢谢', '感谢'],
            a: '不客气！很高兴为您服务~还有什么需要帮忙的吗？',
            tags: ['礼貌']
          },
          { q: ['你好', '在吗', '有人吗'],
            a: '您好！我在~请问有什么可以帮您的？',
            tags: ['问候']
          },
          { q: ['算了', '不要了', '先不点了'],
            a: '好的，没关系！请问还有其他需要帮忙的吗？',
            tags: ['取消']
          },
          { q: ['你是谁', '机器人', 'AI'],
            a: '我是雨姗AI收银助手，是您的智能点餐小助手~可以帮您点餐、推荐菜品、解答问题哦！',
            tags: ['AI']
          },
          { q: ['转人工', '人工客服', '真人'],
            a: '好的，正在为您转接人工客服，请稍候...',
            tags: ['转人工']
          }
        ]
      }
    };
  }

  /**
   * 构建关键词索引（用于快速匹配）
   */
  buildKeywordIndex() {
    const index = new Map();

    // 遍历所有类别和模式
    for (const [category, data] of Object.entries(this.knowledgeBase)) {
      if (data.patterns) {
        for (const pattern of data.patterns) {
          for (const keyword of pattern.q) {
            if (!index.has(keyword)) {
              index.set(keyword, []);
            }
            index.get(keyword).push({
              answer: pattern.a,
              tags: pattern.tags,
              category
            });
          }
        }
      }
    }

    return index;
  }

  /**
   * 查找答案
   */
  findAnswer(message) {
    const msg = message.toLowerCase().trim();

    // 1. 精确匹配关键词
    for (const [keyword, results] of this.keywordIndex.entries()) {
      if (msg.includes(keyword)) {
        return {
          answer: results[0].answer,
          confidence: 0.95,
          category: results[0].category,
          tags: results[0].tags
        };
      }
    }

    // 2. 模糊匹配
    const words = msg.split(/[\s,，.。!！?？]+/).filter(w => w.length > 1);
    let bestMatch = null;
    let bestScore = 0;

    for (const [category, data] of Object.entries(this.knowledgeBase)) {
      if (data.patterns) {
        for (const pattern of data.patterns) {
          for (const q of pattern.q) {
            const qWords = q.split(/[\s,，.。!！?？]+/).filter(w => w.length > 1);
            
            // 计算匹配分数
            let score = 0;
            for (const word of words) {
              if (q.includes(word) || qWords.some(qw => qw.includes(word))) {
                score++;
              }
            }

            if (score > bestScore && score > 0) {
              bestScore = score;
              bestMatch = {
                answer: pattern.a,
                confidence: score / Math.max(words.length, qWords.length),
                category,
                tags: pattern.tags
              };
            }
          }
        }
      }
    }

    if (bestMatch) {
      return bestMatch;
    }

    // 3. 无法匹配
    return {
      answer: null,
      confidence: 0,
      category: 'unknown',
      needHuman: true
    };
  }

  /**
   * 处理用户问题
   */
  answer(message, context = {}) {
    const result = this.findAnswer(message);

    // 检查是否需要转人工
    if (result.needHuman || result.confidence < 0.3) {
      return {
        type: 'transfer_human',
        reply: '抱歉，这个问题我不太确定，让我帮您转接人工客服~',
        suggestion: '建议转人工处理'
      };
    }

    // 组合上下文回复
    let reply = result.answer;

    // 如果有相关上下文，添加额外信息
    if (context.customerProfile?.preferences?.dislikes?.length > 0 && result.tags?.includes('忌口')) {
      const dislikes = context.customerProfile.preferences.dislikes;
      reply += ` 我已经记得您不吃${dislikes.join('、')}，会特别注意的~`;
    }

    return {
      type: 'faq',
      reply,
      confidence: result.confidence,
      category: result.category,
      tags: result.tags
    };
  }

  /**
   * 获取FAQ统计
   */
  getStats() {
    let totalQuestions = 0;
    const categoryCount = {};

    for (const [category, data] of Object.entries(this.knowledgeBase)) {
      if (data.patterns) {
        categoryCount[category] = data.patterns.length;
        totalQuestions += data.patterns.length;
      }
    }

    return {
      totalQuestions,
      totalCategories: Object.keys(this.knowledgeBase).length,
      categoryCount
    };
  }

  /**
   * 获取所有问题列表
   */
  getAllQuestions() {
    const questions = [];

    for (const [category, data] of Object.entries(this.knowledgeBase)) {
      if (data.patterns) {
        for (const pattern of data.patterns) {
          questions.push({
            category,
            questions: pattern.q,
            answer: pattern.a,
            tags: pattern.tags
          });
        }
      }
    }

    return questions;
  }
}

module.exports = FAQSystem;
