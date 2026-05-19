@echo off
chcp 65001 >nul
echo ========================================
echo   雨姗AI收银助手智能餐饮系统 - Windows安装程序
echo ========================================
echo.

echo [1/4] 正在检查 Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo   ❌ 未检测到 Node.js
    echo   请先安装 Node.js 18+
    echo   下载地址: https://nodejs.org/
    echo.
    echo   安装步骤:
    echo   1. 打开上述网址
    echo   2. 下载 Windows 版本 (LTS版)
    echo   3. 双击安装，一路下一步
    echo   4. 安装完成后重新运行此脚本
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo   ✅ Node.js %NODE_VERSION% 已安装

echo.
echo [2/4] 正在安装项目依赖...
cd /d "%~dp0lambda"
call npm install
if errorlevel 1 (
    echo   ❌ 依赖安装失败
    pause
    exit /b 1
)
echo   ✅ 依赖安装完成

echo.
echo [3/4] 正在创建数据目录...
if not exist "%~dp0data" mkdir "%~dp0data"
if not exist "%~dp0uploads" mkdir "%~dp0uploads"
if not exist "%~dp0logs" mkdir "%~dp0logs"
echo   ✅ 数据目录创建完成

echo.
echo [4/4] 正在创建配置文件...
if not exist "%~dp0.env" (
    (
        echo # 服务器配置
        echo PORT=3000
        echo.
        echo # 数据库配置 ^(SQLite本地文件^)
        echo DB_TYPE=sqlite
        echo DB_PATH=..\data\catering.db
        echo.
        echo # JWT密钥 ^(生产环境请修改^)
        echo JWT_SECRET=your-secret-key-change-in-production
        echo.
        echo # 租户配置
        echo DEFAULT_TENANT_ID=tenant_001
        echo.
        echo # 日志配置
        echo LOG_LEVEL=info
    ) > "%~dp0.env"
    echo   ✅ 配置文件已创建
) else (
    echo   ✅ 配置文件已存在
)

echo.
echo ========================================
echo   安装完成！
echo ========================================
echo.
echo 下一步:
echo   1. 双击运行 start.bat 启动系统
echo   2. 首次启动时系统将自动创建管理员账号
echo   3. 管理员初始密码将显示在控制台日志中
echo   4. 打开浏览器访问 http://localhost:3000/admin
echo.
echo   ⚠️  安全提示:
echo   - 首次登录后请立即修改管理员密码
echo   - 生产环境请修改.env文件中的JWT_SECRET等敏感配置
echo.
pause
