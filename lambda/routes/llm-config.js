const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { requireAdmin } = require('../middleware/auth');

const ENV_PATH = path.join(__dirname, '../../.env');

function readEnv() {
  if (fs.existsSync(ENV_PATH)) {
    return fs.readFileSync(ENV_PATH, 'utf8');
  }
  return '';
}

function parseEnv(content) {
  const config = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      config[match[1].trim()] = match[2].trim();
    }
  });
  return config;
}

function updateEnvFile(newConfig) {
  try {
    let content = readEnv();
    const existingConfig = parseEnv(content);
    
    Object.keys(newConfig).forEach(key => {
      const value = newConfig[key];
      const escapedValue = String(value).replace(/[\\$'"`]/g, '\\$&');
      const regex = new RegExp(`^${key}=.*$`, 'm');
      
      if (regex.test(content)) {
        content = content.replace(regex, `${key}=${escapedValue}`);
      } else {
        if (content && !content.endsWith('\n')) {
          content += '\n';
        }
        content += `${key}=${escapedValue}\n`;
      }
    });
    
    fs.writeFileSync(ENV_PATH, content);
    return true;
  } catch (error) {
    logger.error('Failed to update .env file:', error);
    return false;
  }
}

router.get('/providers', requireAdmin, (req, res) => {
  try {
    const llmService = require('../services/llm-service');
    const providers = llmService.getAllProviders();
    
    res.json({
      success: true,
      providers: providers.map(p => ({
        id: p.id,
        name: p.name,
        icon: p.icon,
        requiresSecret: p.requiresSecret,
        apiType: p.apiType
      }))
    });
  } catch (error) {
    logger.error('Get LLM providers failed:', error);
    res.status(500).json({
      success: false,
      message: '获取提供商列表失败'
    });
  }
});

router.get('/status', requireAdmin, (req, res) => {
  try {
    const envContent = readEnv();
    const config = parseEnv(envContent);
    const llmService = require('../services/llm-service');
    
    const providers = llmService.getAllProviders();
    const providerStatus = {};
    
    providers.forEach(p => {
      const prefix = p.id.toUpperCase();
      providerStatus[p.id] = {
        configured: !!(config[`${prefix}_API_KEY`]),
        model: config[`${prefix}_MODEL`] || 'default',
        requiresSecret: p.requiresSecret,
        configuredSecret: p.requiresSecret ? !!(config[`${prefix}_SECRET_KEY`]) : true,
        apiType: config[`${prefix}_API_TYPE`] || 'openai',
        baseUrl: config[`${prefix}_BASE_URL`] || null
      };
    });
    
    const llmEnabled = !!(config.LLM_PROVIDER && config[`${config.LLM_PROVIDER.toUpperCase()}_API_KEY`]);
    
    res.json({
      success: true,
      data: {
        enabled: llmEnabled,
        provider: config.LLM_PROVIDER || null,
        providers: providerStatus
      }
    });
  } catch (error) {
    logger.error('Get LLM status failed:', error);
    res.status(500).json({
      success: false,
      message: '获取配置失败'
    });
  }
});

router.post('/config', requireAdmin, (req, res) => {
    try {
        const { provider, apiKey, model, secretKey, baseUrl, apiType } = req.body;
        
        if (!provider) {
            return res.status(400).json({
                success: false,
                message: '请提供提供商信息'
            });
        }
        
        const llmService = require('../services/llm-service');
        const providerInfo = llmService.getProviderConfig(provider);
        
        if (!providerInfo) {
            return res.status(400).json({
                success: false,
                message: '不支持的大模型提供商'
            });
        }
        
        const envContent = readEnv();
        const existingConfig = parseEnv(envContent);
        const prefix = provider.toUpperCase();
        const existingApiKey = existingConfig[`${prefix}_API_KEY`];
        
        // 如果没有提供API Key，但是已经有保存的，则允许只更新其他配置
        if (!apiKey && !existingApiKey) {
            return res.status(400).json({
                success: false,
                message: '请提供 API Key'
            });
        }
        
        const newConfig = {
            'LLM_PROVIDER': provider,
        };
        
        if (apiKey && apiKey.length >= 10) {
            newConfig[`${prefix}_API_KEY`] = apiKey;
        }
        
        if (model) {
            newConfig[`${prefix}_MODEL`] = model;
        }
        
        if (apiType) {
            newConfig[`${prefix}_API_TYPE`] = apiType;
        }
        
        if (secretKey && providerInfo.requiresSecret) {
            newConfig[`${prefix}_SECRET_KEY`] = secretKey;
        }
        
        if (baseUrl) {
            newConfig[`${prefix}_BASE_URL`] = baseUrl;
        }
        
        const success = updateEnvFile(newConfig);
        
        if (success) {
            logger.info(`LLM configuration updated: provider=${provider}`);
            
            setTimeout(() => {
                logger.info('LLM config updated, service will use new config on next request');
            }, 100);
            
            res.json({
                success: true,
                message: '配置成功！商家端已启用智能AI回复功能',
                data: {
                    provider,
                    model: model || 'default',
                    apiType: apiType || 'openai'
                }
            });
        } else {
            res.status(500).json({
                success: false,
                message: '配置保存失败，请检查文件权限'
            });
        }
    } catch (error) {
        logger.error('Save LLM config failed:', error);
        res.status(500).json({
            success: false,
            message: '配置保存失败'
        });
    }
});

router.post('/test', requireAdmin, async (req, res) => {
  try {
    const { provider, apiKey, baseUrl, apiType, model } = req.body;
    
    if (!provider) {
      return res.status(400).json({
        success: false,
        message: '请提供提供商'
      });
    }
    
    const envContent = readEnv();
    const existingConfig = parseEnv(envContent);
    const prefix = provider.toUpperCase();
    const existingApiKey = existingConfig[`${prefix}_API_KEY`];
    const existingBaseUrl = existingConfig[`${prefix}_BASE_URL`];
    const existingApiType = existingConfig[`${prefix}_API_TYPE`];
    const existingModel = existingConfig[`${prefix}_MODEL`];
    
    const finalApiKey = apiKey || existingApiKey;
    if (!finalApiKey) {
      return res.status(400).json({
        success: false,
        message: '请提供API Key'
      });
    }
    
    const llmService = require('../services/llm-service');
    
    const testResult = await llmService.testConnection({
      provider,
      apiKey: finalApiKey,
      baseUrl: baseUrl || existingBaseUrl,
      apiType: apiType || existingApiType || 'openai',
      model: model || existingModel || 'default'
    });
    
    if (testResult.success) {
      res.json({
        success: true,
        message: '✅ 连接成功！API Key有效',
        latency: testResult.latency,
        model: testResult.model
      });
    } else {
      res.json({
        success: false,
        message: '❌ 连接失败：' + testResult.message
      });
    }
  } catch (error) {
    logger.error('LLM test connection failed:', error);
    res.json({
      success: false,
      message: '❌ 测试连接失败：' + error.message
    });
  }
});

module.exports = router;