const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/prompt-security.log' }),
    new winston.transports.Console()
  ]
});

const PROMPT_INJECTION_PATTERNS = [
  /(?:system|assistant|user)\s*:/gi,
  /---\s*(system|assistant|user)\s*---/gi,
  /^\s*###?\s*(system|assistant|user)/im,
  /<\|(system|assistant|user)\|>/gi,
  /\[?(system|assistant|user)\]?:/gi,
  /角色:\s*(system|assistant|user)/gi,
  /指令:\s*/gi,
  /prompt:/gi,
  /ignore\s+previous/gi,
  /ignore\s+above/gi,
  /forget\s+previous/gi,
  /reset\s+context/gi,
  /override\s+instructions/gi,
  /disregard\s+instructions/gi,
  /break\s+out/gi,
  /escape\s+prompt/gi,
  /you\s+are\s+now/gi,
  /change\s+your\s+role/gi,
  /扮演\s*.*角色/gi,
  /我命令你/gi,
  /现在你是/gi,
  /假设你是/gi,
  /请忽略/gi,
  /无视以上/gi,
  /推翻指令/gi,
  /拒绝执行/gi,
  /取消之前/gi,
  /重新开始/gi,
  /清除记忆/gi,
  /清空对话/gi,
  /reset\s+all/gi,
  /清除所有/gi,
  /删除所有/gi,
  /销毁/gi,
  /自杀/gi,
  /自我毁灭/gi,
  /hack/gi,
  /exploit/gi,
  /attack/gi,
  /malware/gi,
  /virus/gi,
  /phishing/gi,
  /social\s+engineering/gi,
  /sql\s+inject/gi,
  /xss/gi,
  /csrf/gi,
  /buffer\s+overflow/gi,
  /denial\s+of\s+service/gi,
  /ddos/gi,
  /password\s+cracking/gi,
  /brute\s+force/gi,
  /credential\s+stuffing/gi,
  /数据泄露/gi,
  /窃取/gi,
  /入侵/gi,
  /攻击/gi,
  /渗透/gi,
  /漏洞/gi,
  /后门/gi,
  /木马/gi,
  /勒索/gi,
  /诈骗/gi,
  /钓鱼/gi,
  /欺骗/gi,
  /伪造/gi,
  /假冒/gi,
  /冒充/gi,
  /伪装/gi
];

const SENSITIVE_KEYWORDS = [
  'password', 'pwd', 'passwd', 'secret', 'token', 'key', 'api_key',
  'access_token', 'refresh_token', 'cookie', 'session', 'credential',
  'private_key', 'public_key', 'certificate', 'ssh', 'rsa', 'aes',
  'md5', 'sha', 'hash', 'encrypt', 'decrypt', '解密', '加密',
  '密钥', '密码', '验证码', 'token', '令牌', '证书', '私钥', '公钥',
  '身份证', '银行卡', '手机号', '邮箱', '账户', '账号', '用户名',
  'admin', 'root', 'superuser', 'administrator', '管理员', '超级用户',
  'database', 'db', 'mysql', 'postgres', 'mongodb', 'redis',
  'localhost', '127.0.0.1', 'internal', 'intranet', '内网', '服务器',
  'api', '接口', 'endpoint', '端口', 'port', '8080', '3000', '80', '443',
  'config', 'configuration', '设置', '配置', '系统设置', '管理员设置',
  'backup', 'restore', '备份', '恢复', '导入', '导出', 'upload', 'download',
  'delete', 'drop', 'remove', 'destroy', '删除', '销毁', '清除',
  'exec', 'execute', 'run', '命令', '执行', '运行', 'system', 'shell',
  'terminal', 'cmd', 'bash', 'powershell', 'python', 'node', 'php', 'java',
  'eval', 'require', 'import', 'include', '加载', '引入', '调用',
  'url', 'link', '链接', '网址', '网站', '域名', 'domain',
  'http://', 'https://', 'ftp://', 'sftp://', 'file://',
  '<script', '</script>', '<iframe', '</iframe>', 'javascript:', 'vbscript:'
];

const MAX_PROMPT_LENGTH = 3000;
const MAX_USER_INPUT_LENGTH = 1000;

const PROMPT_TEMPLATES = {
  ORDER_QUERY: {
    name: '订单查询',
    template: `你是一个智能点餐助手。用户想查询订单信息。

用户输入: {{user_input}}

请根据用户输入，提取以下信息：
1. 订单号（如果有）
2. 查询意图（查询状态/查询详情/查询历史）
3. 时间范围（如果有）

请以JSON格式返回结果。`,
    validate: (input) => {
      return input.length > 0 && input.length <= MAX_USER_INPUT_LENGTH;
    }
  },
  MENU_RECOMMEND: {
    name: '菜品推荐',
    template: `你是一个智能点餐助手。用户需要菜品推荐。

用户输入: {{user_input}}

请根据用户输入，分析：
1. 用户偏好（口味、食材、价格范围等）
2. 用餐场景（早餐/午餐/晚餐/下午茶）
3. 人数
4. 特殊需求（素食、过敏等）

请以JSON格式返回推荐建议。`,
    validate: (input) => {
      return input.length > 0 && input.length <= MAX_USER_INPUT_LENGTH;
    }
  },
  CUSTOMER_SERVICE: {
    name: '客服咨询',
    template: `你是一个餐饮客服助手。用户有问题咨询。

用户输入: {{user_input}}

请分析用户的问题类型：
1. 投诉建议
2. 预约咨询
3. 会员卡问题
4. 其他

请以友好的方式回复用户。`,
    validate: (input) => {
      return input.length > 0 && input.length <= MAX_USER_INPUT_LENGTH;
    }
  },
  TEXT_ORDER: {
    name: '文本点餐',
    template: `你是一个智能点餐助手。用户通过自然语言点餐。

用户输入: {{user_input}}

请解析订单信息：
1. 菜品名称和数量
2. 特殊要求（口味、做法等）
3. 桌号（如果有）

请以JSON格式返回解析结果。`,
    validate: (input) => {
      return input.length > 0 && input.length <= MAX_USER_INPUT_LENGTH;
    }
  }
};

class PromptSecurity {
  constructor() {
    this.blockedPatterns = new Set(PROMPT_INJECTION_PATTERNS);
    this.sensitiveKeywords = new Set(SENSITIVE_KEYWORDS);
  }

  scanForInjection(input) {
    if (!input || typeof input !== 'string') {
      return { safe: true, score: 0, messages: [] };
    }

    const messages = [];
    let score = 0;

    for (const pattern of this.blockedPatterns) {
      if (pattern.test(input)) {
        score += 1;
        messages.push(`检测到注入模式: ${pattern.toString()}`);
      }
    }

    for (const keyword of this.sensitiveKeywords) {
      const keywordPattern = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (keywordPattern.test(input)) {
        score += 0.5;
        messages.push(`检测到敏感关键词: ${keyword}`);
      }
    }

    if (input.length > MAX_USER_INPUT_LENGTH) {
      score += 2;
      messages.push(`输入长度超限: ${input.length} > ${MAX_USER_INPUT_LENGTH}`);
    }

    const hasEscapeSequence = /(%0[0-9a-f])|(%[27])|(\x00)/gi.test(input);
    if (hasEscapeSequence) {
      score += 1;
      messages.push('检测到URL编码或转义序列');
    }

    const hasBase64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input);
    if (hasBase64 && input.length > 20) {
      score += 0.5;
      messages.push('检测到疑似Base64编码内容');
    }

    return {
      safe: score < 2,
      score,
      messages,
      riskLevel: score >= 5 ? 'CRITICAL' : score >= 3 ? 'HIGH' : score >= 2 ? 'MEDIUM' : 'LOW'
    };
  }

  sanitizeInput(input) {
    if (!input || typeof input !== 'string') {
      return '';
    }

    let sanitized = input.trim();

    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

    sanitized = sanitized.replace(/(<script[^>]*>.*?<\/script>)/gi, '[已过滤]');
    sanitized = sanitized.replace(/(<iframe[^>]*>.*?<\/iframe>)/gi, '[已过滤]');
    sanitized = sanitized.replace(/javascript:/gi, '[已过滤]');
    sanitized = sanitized.replace(/vbscript:/gi, '[已过滤]');
    sanitized = sanitized.replace(/data:/gi, '[已过滤]');

    for (const pattern of this.blockedPatterns) {
      sanitized = sanitized.replace(pattern, '[已过滤]');
    }

    if (sanitized.length > MAX_USER_INPUT_LENGTH) {
      sanitized = sanitized.substring(0, MAX_USER_INPUT_LENGTH) + '...';
    }

    return sanitized;
  }

  validateInput(input) {
    const result = this.scanForInjection(input);
    
    if (!result.safe) {
      logger.warn('Prompt注入检测失败', {
        score: result.score,
        riskLevel: result.riskLevel,
        messages: result.messages,
        input: input.substring(0, 100)
      });
    }

    return result;
  }

  buildPrompt(templateName, userInput, context = {}) {
    const template = PROMPT_TEMPLATES[templateName];
    
    if (!template) {
      throw new Error(`未知的Prompt模板: ${templateName}`);
    }

    const validationResult = template.validate(userInput);
    if (!validationResult) {
      throw new Error('用户输入验证失败');
    }

    const sanitizedInput = this.sanitizeInput(userInput);

    let prompt = template.template;
    prompt = prompt.replace(/\{\{user_input\}\}/g, sanitizedInput);

    for (const [key, value] of Object.entries(context)) {
      const placeholder = `{{${key}}}`;
      const sanitizedValue = typeof value === 'string' ? this.sanitizeInput(value) : JSON.stringify(value);
      prompt = prompt.replace(new RegExp(placeholder, 'g'), sanitizedValue);
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      logger.warn('Prompt长度超限', { length: prompt.length });
      prompt = prompt.substring(0, MAX_PROMPT_LENGTH);
    }

    return {
      prompt,
      templateName: template.name,
      sanitizedInput,
      length: prompt.length
    };
  }

  getAvailableTemplates() {
    return Object.keys(PROMPT_TEMPLATES);
  }

  addCustomPattern(pattern) {
    if (pattern instanceof RegExp) {
      this.blockedPatterns.add(pattern);
      logger.info('添加自定义注入模式', { pattern: pattern.toString() });
    } else if (typeof pattern === 'string') {
      this.blockedPatterns.add(new RegExp(pattern, 'gi'));
      logger.info('添加自定义注入模式', { pattern });
    }
  }

  removePattern(pattern) {
    if (pattern instanceof RegExp) {
      this.blockedPatterns.delete(pattern);
    }
  }

  addSensitiveKeyword(keyword) {
    if (typeof keyword === 'string') {
      this.sensitiveKeywords.add(keyword.toLowerCase());
      logger.info('添加敏感关键词', { keyword });
    }
  }

  removeSensitiveKeyword(keyword) {
    this.sensitiveKeywords.delete(keyword.toLowerCase());
  }
}

module.exports = new PromptSecurity();