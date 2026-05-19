@echo off
chcp 65001 >nul
title 批量替换品牌名

echo.
echo ========================================
echo     批量替换品牌名工具
echo ========================================
echo.
echo 正在替换文件中...
echo.

set count=0
set filecount=0

for /r %%f in (*.html *.js *.json *.md *.bat *.yml *.yaml *.txt) do (
    findstr /m "雨姗AI收银助手" "%%f" >nul 2>&1
    if not errorlevel 1 (
        echo 处理: %%f
        powershell -Command "(Get-Content '%%f') -replace '雨姗AI收银助手', '雨姗AI收银助手' -replace '雨姗AI收银助手', '雨姗AI收银助手' -replace 'yushan', 'yushan' | Set-Content '%%f' -Encoding UTF8"
        set /a filecount+=1
        powershell -Command "(Get-Content '%%f' -Raw) -split [Environment]::NewLine | ForEach-Object { if ($_ -match '雨姗AI收银助手|雨姗AI收银助手') { $script:count += ($_ -split '雨姗AI收银助手|雨姗AI收银助手').Count - 1 } }"
    )
)

echo.
echo ========================================
echo 处理完成！
echo 文件数: %filecount%
echo ========================================
echo.
pause
