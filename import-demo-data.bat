@echo off
chcp 65001 >nul
echo ========================================
echo   导入演示数据
echo ========================================
echo.

cd /d "%~dp0"
cd lambda\scripts

if not exist "import-demo-data.js" (
    echo ❌ 脚本文件不存在
    pause
    exit /b 1
)

echo 🚀 正在导入演示数据...
echo.

node import-demo-data.js

echo.
echo ========================================
pause
