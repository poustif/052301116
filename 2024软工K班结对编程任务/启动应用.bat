@echo off
chcp 65001 >nul
title 学生点名系统 - 轻量版

echo.
echo ==========================================
echo           学生点名系统 - 轻量版
echo ==========================================
echo.

REM 检查是否有Python的http.server
python -c "import http.server" 2>nul
if %errorlevel% == 0 (
    echo ✅ 使用 Python 启动本地服务器...
    echo 📱 应用地址: http://localhost:8080
    echo ⏹️  按 Ctrl+C 停止服务器
    echo.
    timeout /t 3 /nobreak >nul
    start http://localhost:8080
    python -m http.server 8080
    goto :end
)

REM 检查是否有Node.js的http-server
where node >nul 2>nul
if %errorlevel% == 0 (
    echo ✅ 使用 Node.js 启动本地服务器...
    echo 📱 应用地址: http://localhost:8080
    echo ⏹️  按 Ctrl+C 停止服务器
    echo.
    timeout /t 3 /nobreak >nul
    start http://localhost:8080
    npx http-server -p 8080 -c-1 --cors
    goto :end
)

REM 如果都没有，提供更多选项
echo ⚠️  未检测到 Python 或 Node.js
echo.
echo 🔧 解决方案:
echo 1. 安装 Python (推荐): https://python.org
echo 2. 安装 Node.js: https://nodejs.org
echo 3. 或者直接打开文件 (功能可能受限)
echo.
echo 选择操作:
echo [1] 直接打开文件 (可能有功能限制)
echo [2] 退出
echo.
set /p choice="请输入选择 (1-2): "

if "%choice%"=="1" (
    echo.
    echo 📂 直接打开文件...
    echo ⚠️  注意: Excel导入功能可能需要本地服务器
    echo.
    start index.html
    goto :end
)

if "%choice%"=="2" (
    goto :end
)

echo 无效选择，直接打开文件...
start index.html

:end
echo.
echo 🎉 操作完成！
echo.
pause
