# 🍔 雨姗AI收银助手餐饮系统 - Windows 完整部署教程

## 目录

- [一、环境准备](#一环境准备)
- [二、获取项目代码](#二获取项目代码)
- [三、配置环境变量](#三配置环境变量)
- [四、数据库初始化](#四数据库初始化)
- [五、安装依赖并启动](#五安装依赖并启动)
- [六、访问系统](#六访问系统)
- [七、常见问题解决](#七常见问题解决)

---

## 一、环境准备

### 1.1 安装 Node.js

1. 访问 https://nodejs.org/
2. 下载 **LTS 版**（推荐 **18.x** 或 **20.x**）
3. 双击安装，**全部默认选项**，一直点"下一步"
4. 安装完成后，按 `Win + R`，输入 `cmd` 回车
5. 在命令行中输入以下命令验证：

```cmd
node -v
npm -v
```

看到版本号（如 v18.20.0）即安装成功。

### 1.2 安装 MySQL

1. 访问 https://dev.mysql.com/downloads/mysql/
2. 选择 **Windows (x86, 64-bit), MSI Installer** 下载
3. 双击安装，选择 **"Full"** 完整安装
4. 安装过程中：
   - 设置 root 密码（**请务必记住这个密码！**）
   - 建议密码：`root123`（简单好记）
5. 验证安装：

```cmd
mysql --version
```

### 1.3 安装 Redis（可选，不影响启动）

1. 访问 https://github.com/microsoftarchive/redis/releases
2. 下载 `Redis-x64-3.0.504.msi`
3. 双击安装，全部默认选项

---

## 二、获取项目代码

### 方式一：使用 Git 克隆（推荐）

```cmd
# 进入 D 盘
D:

# 创建项目目录
mkdir yushan_restaurant
cd yushan_restaurant

# 克隆项目
git clone https://github.com/370205504-cmyk/yushan-ai-cashier-assistant.git

# 进入项目
cd yushan-ai-cashier-assistant
```

### 方式二：下载 ZIP 包（如果 Git 网络不行）

1. 打开浏览器访问 https://github.com/370205504-cmyk/yushan-ai-cashier-assistant
2. 点击绿色 **Code** 按钮 → **Download ZIP**
3. 解压到 `D:\yushan_restaurant\yushan-ai-cashier-assistant`

---

## 三、配置环境变量

```cmd
# 进入项目目录
D:
cd D:\yushan_restaurant\yushan-ai-cashier-assistant

# 复制环境变量文件
copy .env.example .env
```

用**记事本**打开 `.env` 文件，修改以下内容：

| 配置项 | 说明 | 示例值 |
|--------|------|--------|
| `DB_PASSWORD` | MySQL 密码（必改） | `root123` |
| `JWT_SECRET` | JWT 加密密钥（必改） | `Kj8sL2mN5pQ7rT9vX1zA3cE5fG7hJ` |
| `PORT` | 服务端口（可选） | `3000` |
| 其他配置 | 保持默认即可 | |

---

## 四、数据库初始化

### 4.1 创建数据库

```cmd
# 登录 MySQL（会提示输入密码）
mysql -u root -p

# 输入密码后，在 mysql> 提示符下执行：
CREATE DATABASE catering_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 退出 MySQL
EXIT;
```

### 4.2 导入表结构

```cmd
cd D:\yushan_restaurant\yushan-ai-cashier-assistant\lambda
mysql -u root -p catering_system < database\init.sql
```

---

## 五、安装依赖并启动

### 5.1 安装依赖

```cmd
cd D:\yushan_restaurant\yushan-ai-cashier-assistant\lambda
npm install
```

### 5.2 启动服务

```cmd
node server.js
```

**成功标志**，看到以下画面：

```
═══════════════════════════════════════════════════════════
🍽️  雨姗AI收银助手创味菜 - 智能餐饮服务系统
═══════════════════════════════════════════════════════════
🚀 服务已启动: http://localhost:3000
📱 顾客端: http://localhost:3000/
📲 移动端: http://localhost:3000/mobile
⚙️  管理端: http://localhost:3000/admin
🔌 API基础: http://localhost:3000/api/v1
═══════════════════════════════════════════════════════════
```

> **注意**：不要关闭这个命令行窗口！关掉服务就停了。

---

## 六、访问系统

打开浏览器访问：

| 页面 | 地址 |
|------|------|
| 前台点餐 | http://localhost:3000/ |
| 后台管理 | http://localhost:3000/admin |
| 移动端 | http://localhost:3000/mobile |

---

## 七、常见问题解决

### 问题1：git clone 连接失败

```
fatal: unable to access 'https://github.com/...': Recv failure: Connection was reset
```

**解决方法**：使用 VPN 或代理

```cmd
# 设置 Git 代理（7890 换成你的代理端口）
git config --global http.proxy http://127.0.0.1:7890
git config --global https.proxy http://127.0.0.1:7890

# 重新拉取
git pull
```

**没有代理**：用上面的"方式二"下载 ZIP 包。

### 问题2：npm install 报错

```
npm ERR! code EPERM
npm ERR! syscall symlink
```

**解决方法**：以管理员身份运行

1. 右键点击"命令提示符"或"PowerShell"
2. 选择 **"以管理员身份运行"**
3. 重新执行 `npm install`

### 问题3：MySQL 连接失败

```
Error: ER_ACCESS_DENIED_ERROR: Access denied for user 'root'
```

**解决方法**：

1. 检查 `.env` 文件中的 `DB_PASSWORD` 是否和 MySQL 密码一致
2. 确保 MySQL 服务已启动：

```cmd
net start MySQL80
```

### 问题4：端口被占用

```
Error: listen EADDRINUSE :::3000
```

**解决方法**：修改 `.env` 中的端口

```env
PORT=3001
```

或者关闭占用端口的程序：

```cmd
netstat -ano | findstr :3000
taskkill /PID 进程ID /F
```

### 问题5：Redis 连接不上

服务会**自动降级为离线模式**，不影响正常运行。如果想安装 Redis：

1. 打开 `services.msc`（Win+R 输入 services.msc）
2. 找到 "Redis" 服务，右键启动

---

## 一键启动脚本

创建文件 `start.bat`（放在项目根目录），内容如下：

```batch
@echo off
title 雨姗AI收银助手餐饮系统
cd /d D:\yushan_restaurant\yushan-ai-cashier-assistant\lambda
echo ========================================
echo  雨姗AI收银助手餐饮系统 - 正在启动...
echo ========================================
node server.js
pause
```

以后双击这个 `start.bat` 文件就能一键启动了！