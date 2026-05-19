const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const ENV_PATH = path.join(__dirname, '../../.env');

function readEnvConfig() {
  try {
    if (fs.existsSync(ENV_PATH)) {
      const content = fs.readFileSync(ENV_PATH, 'utf8');
      const config = {};
      content.split('\n').forEach(line => {
        const match = line.match(/^(\w+)=(.*)$/);
        if (match) {
          config[match[1]] = match[2];
        }
      });
      return config;
    }
  } catch (e) {
    logger.error('读取.env配置失败:', e.message);
  }
  return {};
}

function getAxiosConfig(timeout = 10000) {
  const config = { timeout };
  const proxyUrl = process.env.http_proxy || process.env.HTTP_PROXY;
  if (proxyUrl) {
    config.httpsAgent = new HttpsProxyAgent(proxyUrl);
    config.proxy = false;
  }
  return config;
}

const providers = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: '🔵',
    apiType: 'openai',
    requiresSecret: false,
    defaultUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-r1-chat', 'deepseek-v4-pro', 'deepseek-v4-flash']
  },
  {
    id: 'moonshot',
    name: 'Moonshot',
    icon: '🌙',
    apiType: 'openai',
    requiresSecret: false,
    defaultUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k']
  },
  {
    id: 'qwen',
    name: 'Qwen',
    icon: '🦄',
    apiType: 'openai',
    requiresSecret: false,
    defaultUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-turbo',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-max-longcontext']
  },
  {
    id: 'zhipu',
    name: 'Zhipu',
    icon: '🧠',
    apiType: 'openai',
    requiresSecret: false,
    defaultUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4',
    models: ['glm-4', 'glm-4v', 'glm-3-turbo']
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '🤖',
    apiType: 'anthropic',
    requiresSecret: false,
    defaultUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-sonnet-20240229',
    models: ['claude-3-sonnet-20240229', 'claude-3-opus-20240229', 'claude-3-haiku-20240307']
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '💬',
    apiType: 'openai',
    requiresSecret: false,
    defaultUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-3.5-turbo',
    models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']
  },
  {
    id: 'gemini',
    name: 'Gemini',
    icon: '✨',
    apiType: 'openai',
    requiresSecret: false,
    defaultUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-pro',
    models: ['gemini-pro', 'gemini-pro-vision']
  },
  {
    id: 'baidu',
    name: 'Baidu Wenxin',
    icon: '🅱️',
    apiType: 'wenxin',
    requiresSecret: true,
    defaultUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions',
    defaultModel: 'completions',
    models: ['completions', 'eb-instant']
  },
  {
    id: 'tencent',
    name: 'Tencent Hunyuan',
    icon: '🦜',
    apiType: 'openai',
    requiresSecret: true,
    defaultUrl: 'https://hunyuan.tencentcloudapi.com/',
    defaultModel: 'hunyuan',
    models: ['hunyuan']
  },
  {
    id: 'doubao',
    name: 'Doubao',
    icon: '🥡',
    apiType: 'openai',
    requiresSecret: false,
    defaultUrl: 'https://api.doubao.com/v1/chat/completions',
    defaultModel: 'Doubao-3',
    models: ['Doubao-3', 'Doubao-3-Plus']
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    icon: '🎯',
    apiType: 'openai',
    requiresSecret: false,
    defaultUrl: 'https://api.minimax.chat/v1/text/completion',
    defaultModel: 'abab6-chat',
    models: ['abab6-chat', 'abab5.5-chat', 'abab5-chat']
  },
  {
    id: 'yandex',
    name: 'YandexGPT',
    icon: '🇷🇺',
    apiType: 'openai',
    requiresSecret: false,
    defaultUrl: 'https://llm.api.cloud.yandex.net/foundationModels/v1',
    defaultModel: 'yandexgpt-lite',
    models: ['yandexgpt', 'yandexgpt-lite']
  }
];

function getAllProviders() {
  return providers;
}

function getProviderConfig(providerId) {
  return providers.find(p => p.id === providerId);
}

async function testConnection({ provider, apiKey, baseUrl, apiType = 'openai', model = 'default' }) {
  const startTime = Date.now();
  
  try {
    const providerConfig = getProviderConfig(provider);
    if (!providerConfig) {
      return { success: false, message: '不支持的提供商' };
    }
    
    const url = baseUrl || providerConfig.defaultUrl;
    const targetModel = model === 'default' ? providerConfig.defaultModel : model;
    
    if (apiType === 'anthropic') {
      const response = await axios.post(
        `${url}/messages`,
        {
          model: targetModel,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hello' }]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          },
          ...getAxiosConfig()
        }
      );
      
      return {
        success: true,
        latency: Date.now() - startTime,
        model: targetModel
      };
    } else if (apiType === 'wenxin') {
      const response = await axios.post(
        `${url}?access_token=${apiKey}`,
        {
          messages: [{ role: 'user', content: 'Hello' }]
        },
        {
          headers: { 'Content-Type': 'application/json' },
          ...getAxiosConfig()
        }
      );
      
      return {
        success: true,
        latency: Date.now() - startTime,
        model: targetModel
      };
    } else {
      const response = await axios.post(
        `${url}/chat/completions`,
        {
          model: targetModel,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hello' }]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          ...getAxiosConfig()
        }
      );
      
      return {
        success: true,
        latency: Date.now() - startTime,
        model: targetModel
      };
    }
  } catch (error) {
    logger.error('LLM test connection error:', error.message);
    return {
      success: false,
      message: error.response?.data?.error?.message || error.message
    };
  }
}

async function chat({ messages, systemPrompt }) {
  try {
    const envConfig = readEnvConfig();
    const provider = envConfig.LLM_PROVIDER;
    if (!provider) {
      return { success: false, message: '未配置大模型' };
    }

    const prefix = provider.toUpperCase();
    const apiKey = envConfig[`${prefix}_API_KEY`];
    if (!apiKey) {
      return { success: false, message: '未配置API Key' };
    }

    const providerConfig = getProviderConfig(provider);
    if (!providerConfig) {
      return { success: false, message: '不支持的提供商' };
    }

    const baseUrl = envConfig[`${prefix}_BASE_URL`] || providerConfig.defaultUrl;
    const model = envConfig[`${prefix}_MODEL`] || providerConfig.defaultModel;
    const apiType = envConfig[`${prefix}_API_TYPE`] || providerConfig.apiType || 'openai';

    const fullMessages = [];
    if (systemPrompt) {
      fullMessages.push({ role: 'system', content: systemPrompt });
    }
    if (messages && messages.length > 0) {
      fullMessages.push(...messages);
    } else {
      fullMessages.push({ role: 'user', content: '你好' });
    }

    // 优化：提高响应速度和准确性
    const timeout = 15000; // 15秒超时，更快响应
    const maxTokens = 500; // 限制token数量，防止回复过长

    if (apiType === 'anthropic') {
      const response = await axios.post(
        `${baseUrl}/messages`,
        {
          model,
          max_tokens: maxTokens,
          messages: fullMessages
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          },
          ...getAxiosConfig(timeout)
        }
      );
      return {
        success: true,
        reply: response.data.content?.[0]?.text || response.data.content?.toString() || ''
      };
    } else {
      const response = await axios.post(
        `${baseUrl}/chat/completions`,
        {
          model,
          messages: fullMessages,
          max_tokens: maxTokens,
          temperature: 0.7, // 降低温度，更稳定
          top_p: 0.8 // 降低top_p，更准确
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          ...getAxiosConfig(timeout)
        }
      );
      
      let reply = response.data.choices?.[0]?.message?.content || '';
      
      if (!reply && response.data.choices?.[0]?.message?.reasoning_content) {
        logger.info('DeepSeek V4: content为空，使用reasoning_content');
        reply = response.data.choices?.[0]?.message?.reasoning_content || '';
      }
      
      return {
        success: true,
        reply: reply
      };
    }
  } catch (error) {
    logger.error('LLM chat error:', error.message);
    return {
      success: false,
      message: error.response?.data?.error?.message || error.message
    };
  }
}

module.exports = {
  getAllProviders,
  getProviderConfig,
  testConnection,
  chat
};
