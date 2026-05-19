const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class SkillManager {
  constructor() {
    this.skills = {};
    this.triggers = {};
    this.skillInstances = {};
    this.loadSkills();
    this.loadTriggers();
  }

  loadSkills() {
    const skillsPath = path.join(__dirname, '../data/skills.json');
    if (fs.existsSync(skillsPath)) {
      try {
        const data = fs.readFileSync(skillsPath, 'utf8');
        this.skills = JSON.parse(data);
      } catch (error) {
        logger.error('加载技能配置失败', { error: error.message });
        this.skills = this.getDefaultSkills();
      }
    } else {
      this.skills = this.getDefaultSkills();
      this.saveSkills();
    }
  }

  loadTriggers() {
    const triggersPath = path.join(__dirname, '../data/triggers.json');
    if (fs.existsSync(triggersPath)) {
      try {
        const data = fs.readFileSync(triggersPath, 'utf8');
        this.triggers = JSON.parse(data);
      } catch (error) {
        logger.error('加载触发器配置失败', { error: error.message });
        this.triggers = this.getDefaultTriggers();
      }
    } else {
      this.triggers = this.getDefaultTriggers();
      this.saveTriggers();
    }
  }

  saveSkills() {
    const skillsPath = path.join(__dirname, '../data/skills.json');
    try {
      fs.writeFileSync(skillsPath, JSON.stringify(this.skills, null, 2));
    } catch (error) {
      logger.error('保存技能配置失败', { error: error.message });
    }
  }

  saveTriggers() {
    const triggersPath = path.join(__dirname, '../data/triggers.json');
    try {
      fs.writeFileSync(triggersPath, JSON.stringify(this.triggers, null, 2));
    } catch (error) {
      logger.error('保存触发器配置失败', { error: error.message });
    }
  }

  getDefaultSkills() {
    return {
      'requirements-analyst': {
        id: 'requirements-analyst',
        name: '需求拆分与分析',
        description: '像产品经理一样细化需求',
        icon: '📋',
        category: '需求分析',
        active: true,
        priority: 1,
        config: {
          enabled: true,
          timeout: 60000
        }
      },
      'frontend-design': {
        id: 'frontend-design',
        name: '规范前端界面设计',
        description: '风格统一不丑',
        icon: '🎨',
        category: '设计',
        active: true,
        priority: 2,
        config: {
          enabled: true,
          timeout: 60000
        }
      },
      'ui-ux-pro-max': {
        id: 'ui-ux-pro-max',
        name: '高品质UI/UX设计',
        description: '界面细节拉满',
        icon: '✨',
        category: '设计',
        active: true,
        priority: 2,
        config: {
          enabled: true,
          timeout: 60000
        }
      },
      'fullstack-developer': {
        id: 'fullstack-developer',
        name: '全栈开发能力增强',
        description: '后端质量提升，bug减少',
        icon: '🔧',
        category: '开发',
        active: true,
        priority: 1,
        config: {
          enabled: true,
          timeout: 60000
        }
      },
      'webapp-testing': {
        id: 'webapp-testing',
        name: 'Web应用自动化测试',
        description: '开发中自动跑单元测试',
        icon: '🧪',
        category: '测试',
        active: true,
        priority: 3,
        config: {
          enabled: true,
          timeout: 60000
        }
      },
      'skill-creator': {
        id: 'skill-creator',
        name: '元技能: 创建新Skill',
        description: '用Skill创建Skill',
        icon: '🚀',
        category: '工具',
        active: true,
        priority: 4,
        config: {
          enabled: true,
          timeout: 60000
        }
      }
    };
  }

  getDefaultTriggers() {
    return {
      'trigger-req-analysis': {
        id: 'trigger-req-analysis',
        name: '需求分析自动触发',
        skillId: 'requirements-analyst',
        enabled: true,
        conditions: {
          type: 'keyword',
          keywords: ['需求', '功能', '开发', '实现', 'feature', 'requirement']
        },
        actions: [{ type: 'execute', params: {} }],
        priority: 1
      },
      'trigger-code-review': {
        id: 'trigger-code-review',
        name: '代码审查自动触发',
        skillId: 'fullstack-developer',
        enabled: true,
        conditions: {
          type: 'file',
          extensions: ['.js', '.ts', '.jsx', '.tsx', '.vue', '.java', '.py']
        },
        actions: [{ type: 'execute', params: {} }],
        priority: 2
      },
      'trigger-test-gen': {
        id: 'trigger-test-gen',
        name: '测试生成自动触发',
        skillId: 'webapp-testing',
        enabled: true,
        conditions: {
          type: 'event',
          events: ['code_commit', 'file_save', 'build_success']
        },
        actions: [{ type: 'execute', params: {} }],
        priority: 3
      },
      'trigger-design': {
        id: 'trigger-design',
        name: '设计规范自动触发',
        skillId: 'frontend-design',
        enabled: true,
        conditions: {
          type: 'keyword',
          keywords: ['设计', '界面', 'UI', '页面', 'layout', 'design']
        },
        actions: [{ type: 'execute', params: {} }],
        priority: 2
      }
    };
  }

  getAllSkills() {
    return Object.values(this.skills);
  }

  getSkill(skillId) {
    return this.skills[skillId] || null;
  }

  updateSkill(skillId, updates) {
    if (!this.skills[skillId]) {
      return { success: false, message: '技能不存在' };
    }
    
    this.skills[skillId] = { ...this.skills[skillId], ...updates };
    this.saveSkills();
    return { success: true, skill: this.skills[skillId] };
  }

  toggleSkill(skillId) {
    if (!this.skills[skillId]) {
      return { success: false, message: '技能不存在' };
    }
    
    this.skills[skillId].active = !this.skills[skillId].active;
    this.saveSkills();
    return { success: true, skill: this.skills[skillId] };
  }

  getAllTriggers() {
    return Object.values(this.triggers);
  }

  getTrigger(triggerId) {
    return this.triggers[triggerId] || null;
  }

  updateTrigger(triggerId, updates) {
    if (!this.triggers[triggerId]) {
      return { success: false, message: '触发器不存在' };
    }
    
    this.triggers[triggerId] = { ...this.triggers[triggerId], ...updates };
    this.saveTriggers();
    return { success: true, trigger: this.triggers[triggerId] };
  }

  toggleTrigger(triggerId) {
    if (!this.triggers[triggerId]) {
      return { success: false, message: '触发器不存在' };
    }
    
    this.triggers[triggerId].enabled = !this.triggers[triggerId].enabled;
    this.saveTriggers();
    return { success: true, trigger: this.triggers[triggerId] };
  }

  addTrigger(trigger) {
    const triggerId = `trigger-${Date.now()}`;
    this.triggers[triggerId] = {
      id: triggerId,
      ...trigger,
      enabled: true
    };
    this.saveTriggers();
    return { success: true, trigger: this.triggers[triggerId] };
  }

  deleteTrigger(triggerId) {
    if (!this.triggers[triggerId]) {
      return { success: false, message: '触发器不存在' };
    }
    
    delete this.triggers[triggerId];
    this.saveTriggers();
    return { success: true };
  }

  async evaluateTriggers(event) {
    const matchedTriggers = [];
    
    for (const [triggerId, trigger] of Object.entries(this.triggers)) {
      if (!trigger.enabled) continue;
      
      if (this.matchTrigger(trigger, event)) {
        matchedTriggers.push({ triggerId, trigger });
      }
    }
    
    matchedTriggers.sort((a, b) => (a.trigger.priority || 1) - (b.trigger.priority || 1));
    
    return matchedTriggers;
  }

  matchTrigger(trigger, event) {
    const conditions = trigger.conditions;
    
    if (!conditions) return false;
    
    switch (conditions.type) {
      case 'keyword': {
        if (!conditions.keywords || !event.content) return false;
        const lowerContent = event.content.toLowerCase();
        return conditions.keywords.some(keyword => 
          lowerContent.includes(keyword.toLowerCase())
        );
      }
      case 'file': {
        if (!conditions.extensions || !event.filePath) return false;
        const ext = path.extname(event.filePath).toLowerCase();
        return conditions.extensions.includes(ext);
      }
      case 'event': {
        if (!conditions.events || !event.type) return false;
        return conditions.events.includes(event.type);
      }
      case 'time': {
        if (!conditions.schedule) return false;
        const now = new Date();
        const hour = now.getHours();
        return hour >= (conditions.schedule.from || 0) && hour <= (conditions.schedule.to || 24);
      }
      case 'custom': {
        if (conditions.expression) {
          try {
            const func = new Function('event', `return ${conditions.expression}`);
            return func(event);
          } catch (e) {
            logger.error('自定义表达式执行失败', { error: e.message });
            return false;
          }
        }
        return false;
      }
      default:
        return false;
    }
  }

  async executeTriggeredSkills(event) {
    const matchedTriggers = await this.evaluateTriggers(event);
    const results = [];
    
    for (const { triggerId, trigger } of matchedTriggers) {
      const result = await this.executeSkill(trigger.skillId, event);
      results.push({
        triggerId,
        skillId: trigger.skillId,
        success: result.success,
        result: result.result,
        timestamp: new Date().toISOString()
      });
    }
    
    return results;
  }

  async executeSkill(skillId, event) {
    const skill = this.skills[skillId];
    if (!skill || !skill.active) {
      return { success: false, message: '技能未启用或不存在' };
    }

    try {
      const aiDevSkills = require('./ai-dev-skills');
      const args = this.buildSkillArgs(skillId, event);
      const result = await aiDevSkills.executeSkill(skillId, ...args);
      
      logger.info(`技能执行成功`, { skillId, eventType: event.type });
      return result;
    } catch (error) {
      logger.error('技能执行失败', { skillId, error: error.message });
      return { success: false, message: error.message };
    }
  }

  buildSkillArgs(skillId, event) {
    switch (skillId) {
      case 'requirements-analyst':
        return [event.content || event.description || ''];
      case 'frontend-design':
        return [event.pageName || '页面', event.content || event.requirements || ''];
      case 'ui-ux-pro-max':
        return [event.pageName || '页面', event.content || event.currentDesign || ''];
      case 'fullstack-developer':
        return [event.content || event.code || '', event.language || 'javascript'];
      case 'webapp-testing':
        return [event.content || event.code || '', event.framework || 'jest'];
      case 'skill-creator':
        return [event.name || '新技能', event.description || '', event.triggers || ''];
      default:
        return [];
    }
  }

  getSkillStats() {
    const stats = {
      total: Object.keys(this.skills).length,
      active: Object.values(this.skills).filter(s => s.active).length,
      categories: {},
      triggers: {
        total: Object.keys(this.triggers).length,
        enabled: Object.values(this.triggers).filter(t => t.enabled).length
      }
    };
    
    for (const skill of Object.values(this.skills)) {
      const category = skill.category || '其他';
      stats.categories[category] = (stats.categories[category] || 0) + 1;
    }
    
    return stats;
  }
}

module.exports = new SkillManager();
