@echo off
echo 正在推送代码到GitHub...
echo.

REM 设置Git凭据
git config --global credential.helper manager-core
git config --global credential.https://github.com.username rainiesyg

REM 尝试推送
echo 尝试推送到GitHub仓库...
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ 代码推送成功！
    echo 🌐 仓库地址: https://github.com/rainiesyg/xlx-text-correction
    echo.
) else (
    echo.
    echo ❌ 推送失败，请检查网络连接或尝试其他方法
    echo.
    echo 💡 可以尝试以下解决方案:
    echo 1. 检查网络连接
    echo 2. 使用VPN或代理
    echo 3. 手动上传文件到GitHub
    echo.
)

pause