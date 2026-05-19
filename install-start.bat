@echo off
chcp 65001 >nul
title 雨姗AI收银助手智能餐饮系统 - 一键启动

echo ========================================
echo   雨姗AI收银助手智能餐饮系统
echo   Windows一键安装启动工具
echo ========================================
echo.

echo [1/4] 检查系统环境...
echo.

REM 检查Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到Node.js
    echo.
    echo 请先安装Node.js:
    echo 1. 访问 https://nodejs.org/
    echo 2. 下载LTS版本（长期支持版）
    echo 3. 安装并重启电脑
    echo 4. 重新运行此脚本
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% 已安装
echo.

echo [2/4] 安装项目依赖...
echo.

cd /d "%~dp0lambda"
call npm install >nul 2>&1
if errorlevel 1 (
    echo [重试] 依赖安装遇到问题，尝试重新安装...
    rmdir /s /q node_modules >nul 2>&1
    call npm install
    if errorlevel 1 (
        echo [错误] 依赖安装失败
        echo 请检查网络连接后重试
        pause
        exit /b 1
    )
)

cd /d "%~dp0"
echo [OK] 依赖安装完成
echo.

echo [3/4] 创建配置文件...
echo.

if not exist ".env" (
    (
        echo # 服务器配置
        echo PORT=3000
        echo NODE_ENV=development
        echo.
        echo # 数据库配置 ^(SQLite本地文件^)
        echo DB_TYPE=sqlite
        echo DB_PATH=.\data\catering.db
        echo.
        echo # JWT密钥
        echo JWT_SECRET=yushan-ai-cashier-local-dev-key
        echo.
        echo # 日志配置
        echo LOG_LEVEL=info
    ) > ".env"
    echo [OK] 配置文件已创建
) else (
    echo [OK] 配置文件已存在
)

REM 创建必要目录
if not exist "data" mkdir "data"
if not exist "uploads" mkdir "uploads"
if not exist "logs" mkdir "logs"
echo [OK] 目录结构已就绪
echo.

echo [4/4] 启动服务...
echo.
echo ========================================
echo   服务启动中，请稍候...
echo ========================================
echo.
echo 即将打开浏览器...
timeout /t 5 /nobreak >nul

cd /d "%~dp0lambda"
start http://localhost:3000
node server.js

pause
