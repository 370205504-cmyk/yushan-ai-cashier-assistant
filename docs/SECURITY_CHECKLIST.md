# 雨姗AI收银助手创味菜 - 生产部署安全检查清单

## 🚨 部署前必检项

### 1. 环境变量配置 [ ]
- [ ] `.env` 文件已创建（不要使用 `.env.example`）
- [ ] `JWT_SECRET` 已修改为强随机密钥（至少32字符）
- [ ] `ADMIN_API_KEY` 已配置（至少32字符）
- [ ] `DB_PASSWORD` 已设置强密码
- [ ] `REDIS_PASSWORD` 已配置（如果Redis需要认证）

### 2. 数据库安全 [ ]
- [ ] MySQL root密码已修改
- [ ] 数据库用户权限已最小化（只授予必要权限）
- [ ] 数据库已创建 `yushan_restaurant` 数据库
- [ ] 数据库迁移脚本已执行 `npm run migrate`

### 3. HTTPS配置 [ ]
- [ ] 域名已备案并解析到服务器
- [ ] SSL证书已申请（Let's Encrypt 或付费证书）
- [ ] HTTP自动跳转HTTPS已配置
- [ ] 微信支付/支付宝回调URL已使用HTTPS

### 4. 微信支付/支付宝 [ ]
- [ ] 微信公众号已申请
- [ ] 微信支付商户号已申请并认证
- [ ] 支付宝应用已创建
- [ ] 支付密钥已正确配置

### 5. 打印机配置 [ ]
- [ ] 热敏打印机已连接并测试
- [ ] `PRINTER_IP` 和 `PRINTER_PORT` 已配置
- [ ] 小票模板已测试打印正常

### 6. 进程守护 [ ]
- [ ] PM2 已全局安装 `npm install -g pm2`
- [ ] PM2 配置已部署 `pm2 start ecosystem.config.js`
- [ ] PM2 开机自启已配置 `pm2 startup` + `pm2 save`
- [ ] 日志目录已创建 `mkdir -p logs`

### 7. Docker部署 [ ]
- [ ] Docker 已安装
- [ ] 数据卷已正确挂载（`docker-compose.yml` 已配置）
- [ ] 容器已启动 `docker-compose up -d`

## 📋 每日检查项

- [ ] PM2 进程状态正常 `pm2 status`
- [ ] 日志无异常错误
- [ ] 订单数据正常写入数据库
- [ ] 打印机正常工作

## 🔧 紧急问题处理

### 服务无法启动
```bash
# 检查端口占用
lsof -i:3000
# 检查PM2日志
pm2 logs yushan-ai-cashier-skill --lines 100
# 检查Node进程
ps aux | grep node
```

### 数据库连接失败
```bash
# 检查MySQL状态
systemctl status mysql
# 测试数据库连接
mysql -u root -p -h localhost
```

### 打印机无响应
```bash
# 测试打印机连接
telnet PRINTER_IP PRINTER_PORT
# 检查打印机纸和墨
```

## 📞 技术支持

如遇问题，请提供：
1. `pm2 logs` 输出
2. 数据库连接测试结果
3. 错误截图
