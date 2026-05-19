# 贡献指南

欢迎来到雨姗AI收银助手创味菜项目！🎉

感谢您有兴趣为项目做出贡献。以下指南将帮助您了解如何参与项目开发。

---

## 📋 目录

- [行为准则](#行为准则)
- [快速开始](#快速开始)
- [开发环境](#开发环境)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)
- [贡献类型](#贡献类型)

---

## 行为准则

参与本项目即表示您同意遵守我们的行为准则。我们致力于营造一个友好、包容的社区环境。

---

## 快速开始

```bash
# 1. Fork 仓库
git clone https://github.com/370205504-cmyk/foodie-chef-alexa-skill.git
cd foodie-chef-alexa-skill

# 2. 安装依赖
cd lambda && npm install

# 3. 创建特性分支
git checkout -b feature/your-feature-name

# 4. 进行开发...

# 5. 测试您的更改
npm test

# 6. 提交并推送
git add .
git commit -m 'Add: your feature description'
git push origin feature/your-feature-name

# 7. 创建 Pull Request
```

---

## 开发环境

### 前置要求

- Node.js 18.x 或更高版本
- npm 9.x 或更高版本
- ASK CLI 2.x
- Amazon Developer 账号
- AWS 账号

### 安装 ASK CLI

```bash
npm install -g ask-cli
ask configure
```

### 本地测试

```bash
# 运行单元测试
npm test

# 使用 ASK CLI 模拟测试
ask simulate -l zh-CN -t "推荐一道川菜"
```

---

## 代码规范

### JavaScript 规范

- 使用 ES6+ 语法
- 使用 2 空格缩进
- 使用单引号字符串
- 始终使用严格相等 (`===`)
- 使用有意义的变量和函数命名

### 示例

```javascript
// ✅ 好的写法
const getRecommendedDishes = (cuisine, taste) => {
  return dishes.filter(dish => 
    dish.cuisine === cuisine && dish.taste === taste
  );
};

// ❌ 避免的写法
function getDishes(c, t) {
  let result = [];
  for (let i = 0; i < dishes.length; i++) {
    if (dishes[i].c === c && dishes[i].t === t) {
      result.push(dishes[i]);
    }
  }
  return result;
}
```

### Alexa Skill 代码规范

- 每个意图使用单独的 Handler
- Handler 必须包含 `canHandle` 和 `handle` 方法
- 使用 `handlerInput.attributesManager` 管理会话属性
- 始终提供 `reprompt` 提示用户

### 示例

```javascript
const MyIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput) === 'MyIntent';
  },
  handle(handlerInput) {
    const speakOutput = '这是我的响应';
    
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt('您还需要其他帮助吗？')
      .getResponse();
  }
};
```

---

## 提交规范

我们使用语义化提交信息格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 类型 (Type)

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更改
- `style`: 代码格式（不影响功能）
- `refactor`: 代码重构
- `perf`: 性能改进
- `test`: 测试相关
- `chore`: 构建/工具相关

### 示例

```bash
git commit -m 'feat(store): 添加门店查询功能'
git commit -m 'fix(order): 修复订单状态更新问题'
git commit -m 'docs(readme): 更新安装说明'
git commit -m 'refactor(service): 重构订单服务模块'
```

---

## Pull Request 流程

1. **Fork 仓库** - 点击 GitHub 上的 Fork 按钮

2. **克隆您的 Fork**
   ```bash
   git clone https://github.com/YOUR-USERNAME/foodie-chef-alexa-skill.git
   ```

3. **创建特性分支**
   ```bash
   git checkout -b feature/amazing-feature
   # 或者
   git checkout -b fix/bug-description
   ```

4. **进行更改** - 按照代码规范进行开发

5. **测试** - 确保所有测试通过
   ```bash
   npm test
   ```

6. **提交更改**
   ```bash
   git add .
   git commit -m '您的提交信息'
   ```

7. **推送到您的 Fork**
   ```bash
   git push origin feature/amazing-feature
   ```

8. **创建 Pull Request** - 在 GitHub 上创建 PR

9. **等待审核** - 项目维护者会审核您的 PR

10. **合并** - 审核通过后，PR 将被合并

---

## 贡献类型

### 🐛 报告 Bug

- 使用 GitHub Issues 提交 Bug 报告
- 包含详细的复现步骤
- 提供您的环境信息（Node.js 版本、操作系统等）

### 💡 提出新功能

- 在 GitHub Issues 中讨论新功能
- 详细描述功能需求和使用场景
- 提供可能的实现建议

### 🔧 代码贡献

我们欢迎以下类型的代码贡献：

#### 添加新菜品

1. 在 `lambda/data/dishes.json` 中添加新菜品
2. 在 `lambda/data/recipes.json` 中添加菜谱
3. 在 `models/zh-CN.json` 和 `models/en-US.json` 中添加菜品名称

**菜品数据格式：**

```json
{
  "id": "dish_xxx",
  "name": "菜品名称",
  "cuisine": "菜系",
  "taste": "口味",
  "difficulty": "难度",
  "cookingTime": "烹饪时间",
  "calories": 卡路里,
  "price": 价格,
  "ingredients": ["食材1", "食材2"],
  "canDeliver": true/false,
  "imageUrl": "图片URL"
}
```

#### 添加新门店

1. 在 `lambda/data/stores.json` 中添加新门店

**门店数据格式：**

```json
{
  "id": "store_xxx",
  "name": "门店名称",
  "district": "区域",
  "address": "地址",
  "phone": "电话",
  "businessHours": "营业时间",
  "location": {"lat": 纬度, "lng": 经度},
  "canDeliver": true/false,
  "canReserve": true/false
}
```

#### 添加新功能

- 创建新的 Handler
- 添加对应的 Intent
- 更新交互模型

### 📚 文档贡献

- 改进现有文档
- 添加使用示例
- 翻译文档

### 🧪 测试贡献

- 添加单元测试
- 添加集成测试
- 改进测试覆盖率

---

## 🙏 感谢

感谢所有为雨姗AI收银助手创味菜项目做出贡献的开发者！

您的每一份贡献都让项目变得更好！

---

## 📞 联系我们

- GitHub Issues: [提交问题](https://github.com/370205504-cmyk/foodie-chef-alexa-skill/issues)
- Pull Requests: [贡献代码](https://github.com/370205504-cmyk/foodie-chef-alexa-skill/pulls)
