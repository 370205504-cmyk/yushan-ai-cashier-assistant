const express = require('express');
const router = express.Router();
const skillManager = require('../services/skill-manager');
const logger = require('../utils/logger');

router.get('/skills', (req, res) => {
  try {
    const skills = skillManager.getAllSkills();
    res.json({ success: true, skills });
  } catch (error) {
    logger.error('获取技能列表失败', { error: error.message });
    res.status(500).json({ success: false, message: '获取技能列表失败' });
  }
});

router.get('/skills/:skillId', (req, res) => {
  try {
    const skill = skillManager.getSkill(req.params.skillId);
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

router.put('/skills/:skillId', (req, res) => {
  try {
    const result = skillManager.updateSkill(req.params.skillId, req.body);
    if (result.success) {
      res.json({ success: true, skill: result.skill });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    logger.error('更新技能失败', { error: error.message });
    res.status(500).json({ success: false, message: '更新技能失败' });
  }
});

router.patch('/skills/:skillId/toggle', (req, res) => {
  try {
    const result = skillManager.toggleSkill(req.params.skillId);
    if (result.success) {
      res.json({ success: true, skill: result.skill });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    logger.error('切换技能状态失败', { error: error.message });
    res.status(500).json({ success: false, message: '切换技能状态失败' });
  }
});

router.get('/triggers', (req, res) => {
  try {
    const triggers = skillManager.getAllTriggers();
    res.json({ success: true, triggers });
  } catch (error) {
    logger.error('获取触发器列表失败', { error: error.message });
    res.status(500).json({ success: false, message: '获取触发器列表失败' });
  }
});

router.get('/triggers/:triggerId', (req, res) => {
  try {
    const trigger = skillManager.getTrigger(req.params.triggerId);
    if (trigger) {
      res.json({ success: true, trigger });
    } else {
      res.status(404).json({ success: false, message: '触发器不存在' });
    }
  } catch (error) {
    logger.error('获取触发器失败', { error: error.message });
    res.status(500).json({ success: false, message: '获取触发器失败' });
  }
});

router.put('/triggers/:triggerId', (req, res) => {
  try {
    const result = skillManager.updateTrigger(req.params.triggerId, req.body);
    if (result.success) {
      res.json({ success: true, trigger: result.trigger });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    logger.error('更新触发器失败', { error: error.message });
    res.status(500).json({ success: false, message: '更新触发器失败' });
  }
});

router.patch('/triggers/:triggerId/toggle', (req, res) => {
  try {
    const result = skillManager.toggleTrigger(req.params.triggerId);
    if (result.success) {
      res.json({ success: true, trigger: result.trigger });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    logger.error('切换触发器状态失败', { error: error.message });
    res.status(500).json({ success: false, message: '切换触发器状态失败' });
  }
});

router.post('/triggers', (req, res) => {
  try {
    const result = skillManager.addTrigger(req.body);
    if (result.success) {
      res.status(201).json({ success: true, trigger: result.trigger });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    logger.error('添加触发器失败', { error: error.message });
    res.status(500).json({ success: false, message: '添加触发器失败' });
  }
});

router.delete('/triggers/:triggerId', (req, res) => {
  try {
    const result = skillManager.deleteTrigger(req.params.triggerId);
    if (result.success) {
      res.json({ success: true, message: '触发器已删除' });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    logger.error('删除触发器失败', { error: error.message });
    res.status(500).json({ success: false, message: '删除触发器失败' });
  }
});

router.post('/event', async (req, res) => {
  try {
    const { event } = req.body;
    if (!event) {
      return res.status(400).json({ success: false, message: '缺少事件数据' });
    }

    logger.info('处理事件', { eventType: event.type, content: event.content?.substring(0, 50) });
    
    const results = await skillManager.executeTriggeredSkills(event);
    
    res.json({
      success: true,
      message: `触发了 ${results.length} 个技能`,
      results
    });
  } catch (error) {
    logger.error('处理事件失败', { error: error.message });
    res.status(500).json({ success: false, message: '处理事件失败', error: error.message });
  }
});

router.get('/stats', (req, res) => {
  try {
    const stats = skillManager.getSkillStats();
    res.json({ success: true, stats });
  } catch (error) {
    logger.error('获取统计信息失败', { error: error.message });
    res.status(500).json({ success: false, message: '获取统计信息失败' });
  }
});

router.post('/execute/:skillId', async (req, res) => {
  try {
    const { skillId } = req.params;
    const { event = {} } = req.body;
    
    logger.info('手动执行技能', { skillId });
    
    const result = await skillManager.executeSkill(skillId, event);
    
    res.json({
      success: result.success,
      skill: skillId,
      data: result.result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('执行技能失败', { error: error.message });
    res.status(500).json({ success: false, message: '执行技能失败', error: error.message });
  }
});

module.exports = router;
