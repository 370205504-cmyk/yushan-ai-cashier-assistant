const llmService = require('./llm-service');
const logger = require('../utils/logger');

class AIDevSkills {
  constructor() {
    this.skills = {
      'requirements-analyst': {
        name: '需求拆分与分析',
        description: '像产品经理一样细化需求',
        icon: '📋',
        active: true
      },
      'frontend-design': {
        name: '规范前端界面设计',
        description: '风格统一不丑',
        icon: '🎨',
        active: true
      },
      'ui-ux-pro-max': {
        name: '高品质UI/UX设计',
        description: '界面细节拉满',
        icon: '✨',
        active: true
      },
      'fullstack-developer': {
        name: '全栈开发能力增强',
        description: '后端质量提升，bug减少',
        icon: '🔧',
        active: true
      },
      'webapp-testing': {
        name: 'Web应用自动化测试',
        description: '开发中自动跑单元测试',
        icon: '🧪',
        active: true
      },
      'skill-creator': {
        name: '元技能: 创建新Skill',
        description: '用Skill创建Skill',
        icon: '🚀',
        active: true
      }
    };
  }

  getAllSkills() {
    return Object.values(this.skills);
  }

  getSkill(skillId) {
    return this.skills[skillId] || null;
  }

  async analyzeRequirements(description) {
    const systemPrompt = `你是一位资深产品经理和需求分析师。请帮我分析以下需求，并输出结构化的分析结果：

需求描述：${description}

请按以下结构输出：
1. 需求概述：简洁描述需求核心内容
2. 功能模块：列出需要实现的功能模块
3. 用户角色：涉及的用户角色
4. 业务流程：主要业务流程描述
5. 关键需求点：需要特别注意的需求细节
6. 优先级评估：各功能的优先级（P0-P2）
7. 潜在风险：可能遇到的问题和风险
8. 建议方案：技术实现建议

请用中文输出，保持清晰简洁。`;

    const result = await llmService.chat({
      messages: [{ role: 'user', content: '分析以下需求：' + description }],
      systemPrompt
    });

    return {
      skill: 'requirements-analyst',
      success: result.success,
      result: result.reply || '分析失败',
      timestamp: new Date().toISOString()
    };
  }

  async generateFrontendDesign(pageName, requirements) {
    const systemPrompt = `你是一位资深前端设计师。请帮我设计一个高质量的${pageName}页面。

需求：${requirements}

请按以下结构输出设计规范：
1. 页面布局：整体布局结构和组件排列
2. 配色方案：主色、辅助色、中性色
3. 字体规范：标题、正文、小字的字体和大小
4. 组件设计：按钮、卡片、表单等组件样式
5. 交互设计：hover效果、动画、过渡
6. 响应式适配：移动端和桌面端适配策略
7. 设计建议：提升用户体验的建议

请用中文输出，保持清晰简洁。`;

    const result = await llmService.chat({
      messages: [{ role: 'user', content: `设计${pageName}页面，需求：${requirements}` }],
      systemPrompt
    });

    return {
      skill: 'frontend-design',
      success: result.success,
      result: result.reply || '设计生成失败',
      timestamp: new Date().toISOString()
    };
  }

  async enhanceUX(pageName, currentDesign) {
    const systemPrompt = `你是一位顶级UI/UX设计师。请帮我优化以下页面设计，提升用户体验。

页面名称：${pageName}
当前设计：${currentDesign}

请按以下结构输出优化建议：
1. 用户体验问题：当前设计中存在的UX问题
2. 视觉层次优化：如何提升信息层次
3. 交互细节：微交互和动效建议
4. 无障碍设计：可访问性改进
5. 性能优化：加载速度和响应性优化
6. A/B测试建议：可测试的改进方案
7. 最终优化方案：完整的优化建议

请用中文输出，保持清晰简洁。`;

    const result = await llmService.chat({
      messages: [{ role: 'user', content: `优化${pageName}页面的UX设计，当前设计：${currentDesign}` }],
      systemPrompt
    });

    return {
      skill: 'ui-ux-pro-max',
      success: result.success,
      result: result.reply || 'UX优化失败',
      timestamp: new Date().toISOString()
    };
  }

  async codeReview(code, language = 'javascript') {
    const systemPrompt = `你是一位资深全栈开发工程师。请帮我审查以下代码并提供改进建议。

代码语言：${language}
代码内容：
${code}

请按以下结构输出审查结果：
1. 代码质量评估：整体代码质量评分和评价
2. 潜在问题：bug、性能问题、安全隐患
3. 代码优化：可读性、可维护性改进建议
4. 最佳实践：是否符合行业最佳实践
5. 架构建议：架构层面的优化建议
6. 安全性检查：安全漏洞和防护建议
7. 改进代码：优化后的代码示例

请用中文输出，保持清晰简洁。`;

    const result = await llmService.chat({
      messages: [{ role: 'user', content: `审查以下${language}代码：\n${code}` }],
      systemPrompt
    });

    return {
      skill: 'fullstack-developer',
      success: result.success,
      result: result.reply || '代码审查失败',
      timestamp: new Date().toISOString()
    };
  }

  async generateTests(code, testFramework = 'jest') {
    const systemPrompt = `你是一位专业的测试工程师。请帮我为以下代码生成单元测试。

代码内容：
${code}

测试框架：${testFramework}

请按以下结构输出：
1. 测试需求分析：需要测试的功能点
2. 测试用例设计：详细的测试用例
3. 测试代码：可直接运行的测试代码
4. 测试覆盖率：覆盖的场景
5. 边界测试：边界条件测试

请输出完整的测试代码，可以直接复制使用。`;

    const result = await llmService.chat({
      messages: [{ role: 'user', content: `为以下代码生成${testFramework}测试用例：\n${code}` }],
      systemPrompt
    });

    return {
      skill: 'webapp-testing',
      success: result.success,
      result: result.reply || '测试生成失败',
      timestamp: new Date().toISOString()
    };
  }

  async createSkill(skillName, description, triggers) {
    const systemPrompt = `你是一位Skill开发者专家。请帮我创建一个新的Skill。

Skill名称：${skillName}
功能描述：${description}
触发条件：${triggers}

请按以下结构输出Skill定义：
1. Skill元数据：名称、描述、图标、分类
2. 触发条件：详细的触发规则
3. 执行逻辑：核心处理流程
4. 输入参数：需要的输入
5. 输出结果：返回的数据结构
6. 错误处理：异常情况处理
7. 示例代码：实现该Skill的代码框架

请用中文输出，保持清晰简洁，代码使用JavaScript。`;

    const result = await llmService.chat({
      messages: [{ role: 'user', content: `创建一个名为"${skillName}"的Skill，功能：${description}，触发条件：${triggers}` }],
      systemPrompt
    });

    return {
      skill: 'skill-creator',
      success: result.success,
      result: result.reply || 'Skill创建失败',
      timestamp: new Date().toISOString()
    };
  }

  async executeSkill(skillId, ...args) {
    const skill = this.skills[skillId];
    if (!skill || !skill.active) {
      return { success: false, message: '技能未启用或不存在' };
    }

    logger.info(`执行技能: ${skill.name}`, { skillId, args });

    try {
      switch (skillId) {
        case 'requirements-analyst':
          return await this.analyzeRequirements(...args);
        case 'frontend-design':
          return await this.generateFrontendDesign(...args);
        case 'ui-ux-pro-max':
          return await this.enhanceUX(...args);
        case 'fullstack-developer':
          return await this.codeReview(...args);
        case 'webapp-testing':
          return await this.generateTests(...args);
        case 'skill-creator':
          return await this.createSkill(...args);
        default:
          return { success: false, message: '未知技能' };
      }
    } catch (error) {
      logger.error('技能执行失败', { skillId, error: error.message });
      return { success: false, message: error.message };
    }
  }
}

module.exports = new AIDevSkills();
