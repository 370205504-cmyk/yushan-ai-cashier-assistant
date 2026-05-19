@echo off
chcp 65001 >nul
echo ========================================
echo   雨姗AI收银助手智能餐饮系统 - 启动中
echo ========================================
echo.

cd /d "%~dp0lambda"

echo [1/3] 检查 Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo   ❌ Node.js 未安装
    echo   请先运行 install.bat 安装
    pause
    exit /b 1
)
echo   ✅ Node.js 已就绪

echo.
echo [2/3] 检查配置文件...
if not exist "%~dp0.env" (
    echo   ⚠️  配置文件不存在，正在创建...
    call "%~dp0install.bat"
)

echo.
echo [3/3] 启动服务...
echo   端口: 3000
echo   地址: http://localhost:3000
echo.
echo   访问说明:
echo   - 顾客端: http://localhost:3000
echo   - 管理后台: http://localhost:3000/admin
echo   - 移动端: http://localhost:3000/mobile
echo.
echo   按 Ctrl+C 可停止服务
echo ========================================
echo.

set NODE_ENV=development
start http://localhost:3000
node server.js

pause
