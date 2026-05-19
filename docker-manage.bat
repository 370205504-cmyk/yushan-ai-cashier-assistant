@echo off
chcp 65001 >nul
title 雨姗AI收银助手智能餐饮系统 - Docker管理

echo ========================================
echo   雨姗AI收银助手智能餐饮系统
echo   Docker服务管理
echo ========================================
echo.

REM 检查Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo [错误] Docker未安装或未运行
    echo 请先安装Docker Desktop
    pause
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    echo [错误] Docker未运行
    echo 请启动Docker Desktop
    pause
    exit /b 1
)

echo [OK] Docker运行正常
echo.

REM 检查服务状态
docker-compose ps

echo.
echo ========================================
echo   请选择操作：
echo ========================================
echo   1. 启动服务 (up)
echo   2. 停止服务 (down)
echo   3. 重启服务 (restart)
echo   4. 查看日志 (logs)
echo   5. 重新构建 (rebuild)
echo   6. 退出
echo ========================================
echo.

set /p choice=请输入选项 (1-6): 

if "%choice%"=="1" goto :start
if "%choice%"=="2" goto :stop
if "%choice%"=="3" goto :restart
if "%choice%"=="4" goto :logs
if "%choice%"=="5" goto :rebuild
if "%choice%"=="6" goto :end

echo [错误] 无效选项
goto :end

:start
echo.
echo 正在启动服务...
docker-compose up -d
echo.
echo 启动完成！
echo.
goto :check_status

:stop
echo.
echo 正在停止服务...
docker-compose down
echo.
echo 停止完成！
goto :end

:restart
echo.
echo 正在重启服务...
docker-compose restart
echo.
echo 重启完成！
goto :check_status

:logs
echo.
echo 正在打开日志 (按 Ctrl+C 退出)...
docker-compose logs -f
goto :end

:rebuild
echo.
echo 正在重新构建并启动服务...
docker-compose up -d --build
echo.
echo 重建完成！
goto :check_status

:check_status
echo.
echo ========================================
echo   当前服务状态：
echo ========================================
docker-compose ps
echo.
echo 访问地址：
echo   顾客端:   http://localhost:3000
echo   管理后台: http://localhost:3000/admin
echo.

:end
echo.
pause
