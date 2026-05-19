@echo off
chcp 65001 >nul
title 雨姗AI收银助手 - 智能餐饮系统

cd /d "%~dp0"

echo.
echo ╔════════════════════════════════════════════╗
echo ║                                            ║
echo ║        雨姗AI收银助手 - 智能餐饮系统       ║
echo ║              v4.1.0                        ║
echo ║                                            ║
echo ╚════════════════════════════════════════════╝
echo.

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到Node.js，请先安装Node.js
    echo.
    echo 下载地址：https://nodejs.org/zh-cn/download/
    echo.
    pause
    exit /b 1
)

echo [信息] 检测到Node.js，检查依赖...
echo.

if not exist "node_modules" (
    echo [信息] 首次运行，正在安装依赖，请稍候...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [错误] 依赖安装失败，请检查网络连接
        echo.
        pause
        exit /b 1
    )
    echo.
    echo [成功] 依赖安装完成！
    echo.
)

echo.
echo 请选择启动模式：
echo   1. 完整版 (包含所有功能，需要MySQL+Redis)
echo   2. 简化版 (基础功能，无需数据库，快速体验)
echo.
set /p choice=请输入选项 (1 或 2，默认1): 

if "%choice%"=="2" (
    echo.
    echo [信息] 启动简化版...
    echo.
    node lambda/server-simple.js
) else (
    echo.
    echo [信息] 启动完整版...
    echo.
    if not exist ".env" (
        echo [提示] 未检测到.env文件，使用默认配置
        echo.
    )
    node lambda/server.js
)

echo.
echo 服务已停止，按任意键退出...
pause >nul
