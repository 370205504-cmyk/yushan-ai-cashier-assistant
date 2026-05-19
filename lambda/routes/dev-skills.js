const express = require('express');
const router = express.Router();
const aiDevSkills = require('../services/ai-dev-skills');
const logger = require('../utils/logger');

router.get('/skills', (req, res) => {
  try {
    const skills = aiDevSkills.getAllSkills();
    res.json({
      success: true,
      skills: skills.map(s => ({
        id: Object.keys(aiDevSkills.skills).find(k => aiDevSkills.skills[k] === s),
        ...s
      }))
    });
  } catch (error) {
    logger.error('获取技能列表失败', { error: error.message });
    res.status(500).json({ success: false, message: '获取技能列表失败' });
  }
});

router.get('/skills/:skillId', (req, res) => {
  try {
    const skill = aiDevSkills.getSkill(req.params.skillId);
    if (skill) {
      res.json({ success: true, skill });
    } else {
      res.status(404).json({ success: false, message: '技能不存在' });
    }
  } catch (error) {
    logger.error('获取技能失败', { error: error.message });
    res.status(500).json({ success: false, message: '获取技能失败' });
  }
});

router.post('/skills/execute/:skillId', async (req, res) => {
  try {
    const { skillId } = req.params;
    const { args = [] } = req.body;
    
    logger.info('执行开发技能', { skillId, args });
    
    const result = await aiDevSkills.executeSkill(skillId, ...args);
    
    res.json({
      success: result.success,
      skill: skillId,
      data: result.result,
      timestamp: result.timestamp
    });
  } catch (error) {
    logger.error('执行技能失败', { error: error.message });
    res.status(500).json({ success: false, message: '执行技能失败', error: error.message });
  }
});

router.post('/analyze', async (req, res) => {
  try {
    const { description } = req.body;
    if (!description) {
      return res.status(400).json({ success: false, message: '缺少需求描述' });
    }
    
    const result = await aiDevSkills.analyzeRequirements(description);
    
    res.json({
      success: result.success,
      skill: 'requirements-analyst',
      analysis: result.result,
      timestamp: result.timestamp
    });
  } catch (error) {
    logger.error('需求分析失败', { error: error.message });
    res.status(500).json({ success: false, message: '需求分析失败', error: error.message });
  }
});

router.post('/design', async (req, res) => {
  try {
    const { pageName, requirements } = req.body;
    if (!pageName || !requirements) {
      return res.status(400).json({ success: false, message: '缺少页面名称或需求' });
    }
    
    const result = await aiDevSkills.generateFrontendDesign(pageName, requirements);
    
    res.json({
      success: result.success,
      skill: 'frontend-design',
      design: result.result,
      timestamp: result.timestamp
    });
  } catch (error) {
    logger.error('前端设计失败', { error: error.message });
    res.status(500).json({ success: false, message: '前端设计失败', error: error.message });
  }
});

router.post('/enhance-ux', async (req, res) => {
  try {
    const { pageName, currentDesign } = req.body;
    if (!pageName || !currentDesign) {
      return res.status(400).json({ success: false, message: '缺少页面名称或当前设计' });
    }
    
    const result = await aiDevSkills.enhanceUX(pageName, currentDesign);
    
    res.json({
      success: result.success,
      skill: 'ui-ux-pro-max',
      suggestions: result.result,
      timestamp: result.timestamp
    });
  } catch (error) {
    logger.error('UX优化失败', { error: error.message });
    res.status(500).json({ success: false, message: 'UX优化失败', error: error.message });
  }
});

router.post('/code-review', async (req, res) => {
  try {
    const { code, language } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: '缺少代码' });
    }
    
    const result = await aiDevSkills.codeReview(code, language || 'javascript');
    
    res.json({
      success: result.success,
      skill: 'fullstack-developer',
      review: result.result,
      timestamp: result.timestamp
    });
  } catch (error) {
    logger.error('代码审查失败', { error: error.message });
    res.status(500).json({ success: false, message: '代码审查失败', error: error.message });
  }
});

router.post('/generate-tests', async (req, res) => {
  try {
    const { code, framework } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: '缺少代码' });
    }
    
    const result = await aiDevSkills.generateTests(code, framework || 'jest');
    
    res.json({
      success: result.success,
      skill: 'webapp-testing',
      tests: result.result,
      timestamp: result.timestamp
    });
  } catch (error) {
    logger.error('测试生成失败', { error: error.message });
    res.status(500).json({ success: false, message: '测试生成失败', error: error.message });
  }
});

router.post('/create-skill', async (req, res) => {
  try {
    const { name, description, triggers } = req.body;
    if (!name || !description) {
      return res.status(400).json({ success: false, message: '缺少名称或描述' });
    }
    
    const result = await aiDevSkills.createSkill(name, description, triggers || '');
    
    res.json({
      success: result.success,
      skill: 'skill-creator',
      newSkill: result.result,
      timestamp: result.timestamp
    });
  } catch (error) {
    logger.error('创建技能失败', { error: error.message });
    res.status(500).json({ success: false, message: '创建技能失败', error: error.message });
  }
});

module.exports = router;
