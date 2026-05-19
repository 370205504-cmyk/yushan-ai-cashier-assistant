@echo off
chcp 65001 >nul
title 雨姗AI收银助手智能餐饮系统 - Docker部署

echo ========================================
echo   雨姗AI收银助手智能餐饮系统
echo   Docker一键部署脚本 (Windows)
echo ========================================
echo.

REM 检查是否以管理员权限运行
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [提示] 建议以管理员权限运行此脚本
    echo.
)

REM 检查Docker是否安装
echo [检查] 正在检查Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到Docker！
    echo.
    echo 请先安装Docker Desktop:
    echo 1. 访问 https://www.docker.com/products/docker-desktop
    echo 2. 下载并安装Windows版
    echo 3. 启动Docker Desktop
    echo 4. 等待Docker图标显示"运行中"
    echo 5. 重新运行此脚本
    echo.
    pause
    exit /b 1
)

REM 检查Docker是否运行
echo [检查] 检查Docker运行状态...
docker info >nul 2>&1
if errorlevel 1 (
    echo [错误] Docker未运行！
    echo.
    echo 请启动Docker Desktop并等待其完全启动后再试
    pause
    exit /b 1
)

echo [OK] Docker已就绪
echo.

REM 检查.env文件
echo [配置] 检查配置文件...
if not exist ".env" (
    echo [创建] 正在创建配置文件...
    copy ".env.example" ".env" >nul 2>&1
    if exist ".env" (
        echo [OK] 配置文件已创建
    ) else (
        echo [跳过] 使用默认配置
    )
) else (
    echo [OK] 配置文件已存在
)

echo.
echo ========================================
echo   正在启动服务...
echo ========================================
echo.
echo   预计启动时间：30-60秒
echo   MySQL初始化：约20秒
echo   Redis启动：约5秒
echo   应用启动：约10秒
echo.
echo   按 Ctrl+C 可以取消启动
echo.

REM 拉取最新镜像并启动
docker-compose up -d --build

if errorlevel 1 (
    echo.
    echo [错误] Docker启动失败！
    echo.
    echo 常见问题：
    echo 1. 端口3000被占用：netstat -ano ^| findstr :3000
    echo 2. 内存不足：请确保Docker Desktop分配至少4GB内存
    echo 3. 查看日志：docker-compose logs -f
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   等待服务健康检查...
echo ========================================
echo.

REM 等待应用启动
set /a attempts=0
:wait_loop
set /a attempts+=1
if %attempts% gtr 30 (
    echo [警告] 健康检查超时，但服务可能已在运行
    goto :services_ready
)

curl -s http://localhost:3000/api/v1/health >nul 2>&1
if %errorLevel% equ 0 goto :services_ready

REM 显示进度
if %attempts% equ 5 echo [启动中] MySQL数据库初始化...
if %attempts% equ 10 echo [启动中] Redis缓存启动...
if %attempts% equ 15 echo [启动中] 应用服务部署...
if %attempts% equ 20 echo [启动中] 正在配置...

timeout /t 2 /nobreak >nul
goto :wait_loop

:services_ready
echo.
echo ========================================
echo   部署成功！系统已启动
echo ========================================
echo.
echo   访问地址：
echo   ├─ 顾客端：   http://localhost:3000
echo   ├─ 管理后台： http://localhost:3000/admin
echo   └─ 移动端：   http://localhost:3000/mobile
echo.
echo   管理员账号：
   ├─ 首次启动时系统自动生成随机密码
   └─ 密码将显示在控制台日志中
echo.
echo   管理命令：
echo   ├─ 查看日志：docker-compose logs -f
echo   ├─ 停止服务：docker-compose down
echo   └─ 重启服务：docker-compose restart
echo.
echo   首次使用建议：
echo   1. 登录管理后台修改管理员密码
echo   2. 配置门店信息
echo   3. 添加菜品数据
echo.
echo   按任意键打开浏览器...
pause >nul

start http://localhost:3000/admin

echo.
echo [提示] 服务已在后台运行，关闭窗口不会停止服务
echo [提示] 停止服务请运行: docker-compose down
echo.
pause
