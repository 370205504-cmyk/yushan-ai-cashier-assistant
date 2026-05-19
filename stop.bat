@echo off
chcp 65001 >nul
echo ========================================
echo   雨姗AI收银助手智能餐饮系统 - 停止服务
echo ========================================
echo.

echo 正在停止服务...
taskkill /F /IM node.exe >nul 2>&1
echo ✅ 服务已停止

echo.
echo 如需再次启动，请运行 start.bat
pause
