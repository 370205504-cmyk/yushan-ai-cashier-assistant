#!/usr/bin/env node

const http = require('http');

const HOST = process.argv[2] || 'localhost';
const PORT = process.argv[3] || '3000';

const requestData = JSON.stringify({
  query: '推荐几道招牌菜',
  user_id: 'test-user',
  session_id: 'test-session'
});

const options = {
  hostname: HOST,
  port: PORT,
  path: '/agent/text',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': requestData.length
  }
};

console.log('═══════════════════════════════════════════════════════════');
console.log('🍽️  雨姗AI收银助手创味菜 - API测试工具');
console.log('═══════════════════════════════════════════════════════════');
console.log(`测试地址: http://${HOST}:${PORT}`);
console.log(`请求路径: POST /agent/text`);
console.log(`请求数据:`, JSON.parse(requestData));
console.log('═══════════════════════════════════════════════════════════');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📥 响应状态码:', res.statusCode);
    console.log('📥 响应内容:');
    try {
      const result = JSON.parse(data);
      console.log(JSON.stringify(result, null, 2));
    } catch (e) {
      console.log(data);
    }
    console.log('═══════════════════════════════════════════════════════════');
  });
});

req.on('error', (error) => {
  console.error('❌ 请求失败:', error.message);
  console.log('请确保服务器已启动: node server.js');
});

req.write(requestData);
req.end();

console.log('⏳ 等待响应...');
