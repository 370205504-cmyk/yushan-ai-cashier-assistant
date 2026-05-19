const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '雨姗AI收银助手智能餐饮系统 API',
      version: '1.0.0',
      description: '雨姗AI收银助手智能餐饮系统 RESTful API 文档',
      contact: {
        name: '技术支持',
        email: 'support@yushan.com'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3000',
        description: 'API服务器'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            code: { type: 'integer', example: 1001 },
            message: { type: 'string', example: '参数错误' },
            details: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            code: { type: 'integer', example: 0 },
            message: { type: 'string', example: '操作成功' },
            data: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: '认证', description: '用户认证相关接口' },
      { name: '订单', description: '订单管理接口' },
      { name: '菜品', description: '菜品管理接口' },
      { name: '购物车', description: '购物车管理接口' },
      { name: '会员', description: '会员管理接口' },
      { name: '支付', description: '支付相关接口' },
      { name: '管理', description: '后台管理接口' }
    ]
  },
  apis: ['./lambda/routes/*.js']
};

const specs = swaggerJsdoc(options);

const swaggerOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: '雨姗AI收银助手 API 文档',
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'list',
    filter: true,
    showRequestDuration: true
  }
};

function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
}

module.exports = { setupSwagger, specs };
