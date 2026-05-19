# Docker 部署说明（Windows版）

## 快速开始

### 方法一：使用一键部署脚本（推荐）⭐

1. 双击运行 `deploy-docker.bat`
2. 等待30-60秒自动启动
3. 浏览器自动打开管理后台

### 方法二：手动命令

#### 1. 打开PowerShell

在项目文件夹中，按住 `Shift` + 右键点击空白处，选择"在此处打开 PowerShell 窗口"

#### 2. 运行命令（注意不要重复）

**正确命令：**
```powershell
docker-compose up -d
```

**错误示例（不要这样写）：**
```powershell
# ❌ 错误 - 命令重复了
docker-compose up -ddocker-compose up -d

# ❌ 错误 - 两个命令连在一起
docker-compose up -d docker-compose up -d
```

#### 3. 等待启动

```
Starting yushan-mysql ... done
Starting yushan-redis ... done
Starting yushan-ai-cashier-app ... done
```

#### 4. 访问系统

打开浏览器访问：
- 顾客端：http://localhost:3000
- 管理后台：http://localhost:3000/admin

---

## 常用命令

```powershell
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f

# 重新构建（代码更新后）
docker-compose up -d --build

# 查看服务状态
docker-compose ps
```

---

## 常见问题

### 1. Docker未安装
**错误信息：** `'docker' is not recognized`

**解决方法：**
1. 下载 Docker Desktop: https://www.docker.com/products/docker-desktop
2. 安装后启动 Docker Desktop
3. 等待图标显示"运行中"（绿色）
4. 重新打开PowerShell窗口

### 2. Docker未运行
**错误信息：** error during connect / Cannot connect to the Docker daemon

**解决方法：**
1. 在系统托盘找到 Docker 图标
2. 右键 → Dashboard 确认Docker已启动
3. 等待显示 "Docker Desktop is running"

### 3. 端口被占用
**错误信息：** Ports are not available

**解决方法：**
1. 打开 PowerShell，运行：
```powershell
netstat -ano | findstr :3000
```
2. 结束占用端口的进程，或修改 `.env` 文件中的 `PORT=3001`

### 4. 内存不足
**错误信息：** Cannot create container

**解决方法：**
1. 打开 Docker Desktop
2. 设置 → Resources → 分配至少 4GB 内存
3. 重启 Docker Desktop

### 5. 启动超时
**解决方法：**
```powershell
# 查看详细日志
docker-compose logs -f

# 等待MySQL初始化完成（约30秒）
docker-compose logs mysql

# 强制重启
docker-compose restart
```

---

## 服务说明

部署后会自动启动以下服务：

| 服务 | 说明 | 端口 |
|------|------|------|
| app | 主应用 | 3000 |
| mysql | MySQL数据库 | 3306 |
| redis | Redis缓存 | 6379 |

---

## 数据持久化

所有数据都保存在Docker卷中：
- `mysql_data` - 数据库数据
- `redis_data` - 缓存数据
- `./lambda/uploads` - 上传文件
- `./lambda/logs` - 日志文件

**重要：** 只要不执行 `docker-compose down -v`，数据不会丢失！

---

## 备份与恢复

### 备份
```powershell
docker-compose exec mysql mysqldump -uroot -p yushan_restaurant > backup_$(Get-Date -Format "yyyyMMdd_HHmmss").sql
```

### 恢复
```powershell
docker-compose exec -i mysql mysql -uroot -p yushan_restaurant < backup_file.sql
```

---

## 完全卸载

```powershell
# 停止并删除所有容器
docker-compose down

# 删除所有数据卷（谨慎！会删除所有数据）
docker-compose down -v

# 删除镜像
docker rmi $(docker images | grep yushan)
```

---

## 获取帮助

- 项目地址：https://github.com/370205504-cmyk/yushan-ai-cashier-assistant
- 问题反馈：https://github.com/370205504-cmyk/yushan-ai-cashier-assistant/issues
