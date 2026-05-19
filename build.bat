@echo off
chcp 65001 >nul
title 雨姗AI收银助手 v5.0.0 - 绿色版打包工具

echo ============================================
echo 雨姗AI收银助手 v5.0.0 绿色版打包工具
echo ============================================
echo.

set PROJECT_DIR=%~dp0
set BUILD_DIR=%PROJECT_DIR%build
set RELEASE_DIR=%BUILD_DIR%release
set PACKAGE_NAME=yushan-ai-cashier-assistant-v5.0.0-windows
set PACKAGE_PATH=%BUILD_DIR%\%PACKAGE_NAME%.zip

echo [1/9] 清理旧的构建文件...
if exist "%BUILD_DIR%" rmdir /s /q "%BUILD_DIR%"
mkdir "%BUILD_DIR%"
mkdir "%RELEASE_DIR%"
echo 清理完成
echo.

echo [2/9] 复制项目文件...
xcopy "%PROJECT_DIR%lambda" "%RELEASE_DIR%\lambda\" /E /I /Y
copy "%PROJECT_DIR%package.json" "%RELEASE_DIR%\" >nul
copy "%PROJECT_DIR%.env.example" "%RELEASE_DIR%\.env" >nul
copy "%PROJECT_DIR%README.md" "%RELEASE_DIR%\" >nul
copy "%PROJECT_DIR%部署教程-商家版.md" "%RELEASE_DIR%\" >nul
echo 项目文件复制完成
echo.

echo [3/9] 创建启动脚本...
(
echo @echo off
echo chcp 65001 ^>nul
echo title 雨姗AI收银助手 v5.0.0
echo cd /d "%%~dp0"
echo.
echo echo ============================================
echo echo 雨姗AI收银助手 v5.0.0
echo echo ============================================
echo echo.
echo echo 正在启动服务...
echo echo.
echo.
echo REM 检查 Node.js
echo node --version ^>nul 2^>^&1
echo if %%errorlevel%% neq 0 (
echo   echo.
echo   echo [错误] 未检测到 Node.js 18+！
echo   echo.
echo   echo 请先安装 Node.js 18.x LTS:
echo   echo https://nodejs.org/zh-cn/
echo   echo.
echo   pause
echo   exit /b 1
echo ^)
echo.
echo REM 检查 node_modules
echo if not exist "node_modules" (
echo   echo.
echo   echo [提示] 首次运行，正在安装依赖...
echo   echo.
echo   call npm install --omit=dev
echo   if %%errorlevel%% neq 0 (
echo     echo.
echo     echo [错误] 依赖安装失败！
echo     pause
echo     exit /b 1
echo   ^)
echo   echo.
echo   echo [完成] 依赖安装成功！
echo   echo.
echo ^)
echo.
echo REM 初始化SQLite数据库（如果不存在）
echo if not exist "lambda\data\cashier.db" (
echo   echo.
echo   echo [提示] 正在初始化数据库...
echo   echo.
echo   node lambda\database\init-sqlite.js
echo   if %%errorlevel%% neq 0 (
echo     echo [警告] 数据库初始化可能存在问题，继续启动...
echo   ^)
echo ^)
echo.
echo echo [提示] 服务启动中，请勿关闭此窗口...
echo echo [提示] 打开浏览器访问: http://localhost:3000
echo echo.
echo.
echo cd lambda
echo node server.js
echo.
echo pause
) > "%RELEASE_DIR%\启动服务.bat"

echo 启动脚本创建完成
echo.

echo [4/9] 创建停止脚本...
(
echo @echo off
echo chcp 65001 ^>nul
echo title 停止雨姗AI收银助手
echo cd /d "%%~dp0"
echo.
echo echo 正在停止服务...
echo taskkill /f /im node.exe 2^>nul
echo echo 服务已停止
echo pause
) > "%RELEASE_DIR%\停止服务.bat"

echo 停止脚本创建完成
echo.

echo [5/9] 创建初始化数据库脚本...
(
echo @echo off
echo chcp 65001 ^>nul
echo title 初始化数据库
echo cd /d "%%~dp0"
echo.
echo echo ============================================
echo echo 初始化SQLite数据库
echo echo ============================================
echo echo.
echo if not exist "node_modules" (
echo   echo [错误] 请先运行 启动服务.bat 安装依赖
echo   pause
echo   exit /b 1
echo ^)
echo.
echo echo 正在初始化数据库...
echo echo.
echo node lambda\database\init-sqlite.js
echo.
echo if %%errorlevel%% equ 0 (
echo   echo ============================================
echo   echo 数据库初始化完成！
echo   echo ============================================
echo ^)
echo.
echo pause
) > "%RELEASE_DIR%\初始化数据库.bat"

echo 初始化脚本创建完成
echo.

echo [6/9] 创建使用说明文档...
(
echo ========================================================================
echo                    雨姗AI收银助手 v5.0.0 绿色版
echo ========================================================================
echo.
echo 【商家须知】
echo   本版本为开源基础版，适合测试和小规模使用
echo   数据存储在本地SQLite数据库，无需额外安装MySQL
echo.
echo ------------------------------------------------------------------------
echo 一、快速开始（5分钟上手）
echo ------------------------------------------------------------------------
echo.
echo 1. 解压到 D:\YushanAI 目录（路径不要有中文和空格）
echo.
echo 2. 双击运行 【启动服务.bat】
echo    - 首次运行自动安装依赖（需要几分钟）
echo    - 自动创建SQLite数据库
echo    - 服务启动后不要关闭此窗口
echo.
echo 3. 打开浏览器访问 http://localhost:3000
echo.
echo 4. 使用管理员账号登录：
echo    用户名：admin
echo    密码：admin123
echo    ^（首次登录后请修改密码^）
echo.
echo ------------------------------------------------------------------------
echo 二、功能说明
echo ------------------------------------------------------------------------
echo.
echo [基础功能] ✅ 已实现
echo   - 菜单浏览：按分类展示菜品
echo   - 点餐下单：创建订单、添加菜品
echo   - 桌台管理：20个测试桌台
echo   - 订单管理：查看、修改订单状态
echo   - 统计报表：日营收、订单数、客单价
echo   - FAQ问答：WiFi、营业时间、地址等查询
echo.
echo [进阶功能] ⚠️ 框架实现
echo   - AI智能推荐：随机推荐，非真正AI
echo   - AI经营简报：模拟数据
echo   - 收银系统对接：未实现（需要商业版）
echo   - 打印服务：框架待对接
echo.
echo ------------------------------------------------------------------------
echo 三、系统要求
echo ------------------------------------------------------------------------
echo.
echo   Windows 10 或更高版本
echo   Node.js 18.x LTS（必须提前安装）
echo     下载：https://nodejs.org/zh-cn/
echo   内存 4GB 以上
echo   硬盘 500MB 以上
echo.
echo ------------------------------------------------------------------------
echo 四、数据说明
echo ------------------------------------------------------------------------
echo.
echo   数据库：lambda\data\cashier.db（SQLite）
echo   备份：backups\ 目录
echo   日志：logs\ 目录
echo.
echo   数据完全存储在本地，不上传任何数据
echo.
echo ------------------------------------------------------------------------
echo 五、常见问题
echo ------------------------------------------------------------------------
echo.
echo Q: 端口被占用？
echo A: 修改 .env 文件中的 PORT=3001
echo.
echo Q: 忘记管理员密码？
echo A: 删除 lambda\data\cashier.db，然后运行 初始化数据库.bat
echo.
echo Q: 如何备份数据？
echo A: 复制 lambda\data\cashier.db 文件即可
echo.
echo ------------------------------------------------------------------------
echo 六、技术支持
echo ------------------------------------------------------------------------
echo.
echo   GitHub: https://github.com/370205504-cmyk/yushan-ai-cashier-assistant
echo   问题反馈：在GitHub提交Issue
echo.
echo ========================================================================
echo                      祝您使用愉快！
echo ========================================================================
) > "%RELEASE_DIR%\使用说明.txt"

echo 说明文档创建完成
echo.

echo [7/9] 创建配置目录...
mkdir "%RELEASE_DIR%\lambda\data"
mkdir "%RELEASE_DIR%\lambda\backups"
mkdir "%RELEASE_DIR%\lambda\logs"
mkdir "%RELEASE_DIR%\lambda\uploads"
mkdir "%RELEASE_DIR%\public"
echo 配置目录创建完成
echo.

echo [8/9] 创建.env配置文件...
(
echo # 雨姗AI收银助手配置文件
echo # 基础配置
echo PORT=3000
echo HOST=0.0.0.0
echo NODE_ENV=development
echo.
echo # 数据库配置（使用SQLite，无需修改）
echo # SQLite会自动在lambda\data\目录创建
echo.
echo # 安全配置
echo SESSION_SECRET=yushan-ai-cashier-secret-key-change-in-production
echo.
echo # 其他配置
echo LOG_LEVEL=info
) > "%RELEASE_DIR%\.env"

echo 配置文件创建完成
echo.

echo [9/9] 打包...
cd /d "%BUILD_DIR%"
powershell -Command "Compress-Archive -Path '%RELEASE_DIR%\*' -DestinationPath '%PACKAGE_PATH%' -Force"

if exist "%PACKAGE_PATH%" (
  echo.
  echo ============================================
  echo 打包成功！
  echo ============================================
  echo 文件：%PACKAGE_PATH%
  for %%A in ("%PACKAGE_PATH%") do echo 大小：%%~zA 字节
  echo.
  explorer /select,"%PACKAGE_PATH%"
) else (
  echo.
  echo 打包失败！
)

echo.
pause
