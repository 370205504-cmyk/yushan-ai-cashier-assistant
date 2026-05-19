@echo off
chcp 65001 >nul
title Docker镜像源修复工具

echo ========================================
echo   Docker镜像源修复工具
echo ========================================
echo.

echo [说明]
echo 您的Docker镜像源连接不稳定
echo 我们将为您配置更稳定的镜像源
echo.
echo [步骤]
echo 1. 自动打开Docker设置
echo 2. 您需要手动修改配置
echo.
echo 按任意键继续...
pause >nul

REM 检查Docker是否安装
docker --version >nul 2>&1
if errorlevel 1 (
    echo [错误] Docker未安装
    echo 请先安装Docker Desktop
    pause
    exit /b 1
)

echo.
echo ========================================
echo   请按以下步骤操作：
echo ========================================
echo.
echo 1. Docker设置窗口已打开
echo.
echo 2. 在左侧菜单点击 "Docker Engine"
echo.
echo 3. 找到右侧的JSON配置
echo.
echo 4. 将整个JSON内容替换为：
echo.
powershell -Command "Write-Host '{
  \"registry-mirrors\": [
    \"https://hub.rat.dev\",
    \"https://docker.1ms.run\",
    \"https://docker.rainbond.cc\"
  ]
}'"
echo.
echo 5. 点击 "Apply & Restart"
echo.
echo 6. 等待Docker重启完成（约1分钟）
echo.
echo 7. 关闭窗口后按任意键继续
echo.

REM 打开Docker设置
start "" "docker-desktop://dashboard/settings/engine"

echo.
pause

echo.
echo ========================================
echo   正在测试Docker镜像源...
echo ========================================
echo.

REM 测试镜像源连接
echo [测试] 测试镜像源连接...
docker info 2>&1 | findstr "Registry Mirrors" > temp_mirrors.txt
type temp_mirrors.txt
del temp_mirrors.txt

echo.
echo [提示] 如果镜像源配置成功，输出应该包含镜像地址
echo.

echo ========================================
echo   下一步操作：
echo ========================================
echo.
echo 方式1：使用本地完整模式（推荐）^
echo   - 无需Docker，更稳定
echo   - 双击运行 install.bat
echo   - 然后运行 start.bat
echo.
echo 方式2：继续使用Docker
echo   - 等待Docker重启完成
echo   - 运行 docker-compose up -d
echo.
echo 您想：
echo   1. 使用本地完整模式（推荐）
echo   2. 我已完成Docker配置，继续尝试Docker部署
echo   3. 退出
echo.

set /p choice=请输入选项 (1/2/3):

if "%choice%"=="1" goto :local_mode
if "%choice%"=="2" goto :docker_mode
if "%choice%"=="3" goto :end

:local_mode
echo.
echo 正在启动本地完整模式...
echo.
echo [提示] 请运行以下命令：
echo   1. 双击运行 install.bat
echo   2. 双击运行 start.bat
echo.
echo 或双击运行 install-start.bat（一键安装并启动）
echo.
pause
goto :end

:docker_mode
echo.
echo 正在拉取镜像并启动服务...
echo 这可能需要几分钟，请耐心等待...
echo.

docker-compose up -d

if errorlevel 1 (
    echo.
    echo [警告] Docker启动可能遇到问题
    echo 建议改用本地完整模式
    pause
    goto :end
)

echo.
echo [成功] 服务启动完成！
echo.
echo 访问地址：
echo   顾客端: http://localhost:3000
echo   管理后台: http://localhost:3000/admin
echo.
start http://localhost:3000/admin

:end
pause
