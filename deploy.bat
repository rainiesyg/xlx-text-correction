@echo off
chcp 65001 >nul
echo 🚀 开始准备Zeabur部署...
echo.

:: 检查是否有未提交的更改
git status --porcelain >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git未初始化或不在Git仓库中
    echo 请先初始化Git仓库：
    echo   git init
    echo   git remote add origin [your-repo-url]
    pause
    exit /b 1
)

for /f %%i in ('git status --porcelain') do set has_changes=1
if defined has_changes (
    echo 📝 发现未提交的更改，正在提交...
    git add .
    set /p commit_message="请输入提交信息 (直接回车使用默认): "
    if "!commit_message!"=="" set commit_message=准备Zeabur部署
    git commit -m "!commit_message!"
) else (
    echo ✅ 代码已是最新状态
)

:: 推送到远程仓库
echo 📤 推送代码到远程仓库...
git push origin main
if %errorlevel% neq 0 (
    git push origin master
    if %errorlevel% neq 0 (
        echo ❌ 代码推送失败，请检查网络连接和仓库权限
        pause
        exit /b 1
    )
)

echo ✅ 代码推送成功！
echo.
echo 🎯 接下来的步骤:
echo 1. 访问 https://zeabur.com 登录控制台
echo 2. 创建新项目并选择你的代码仓库
echo 3. 配置环境变量 (参考 .env.example)
echo 4. 等待自动部署完成
echo.
echo 📋 需要配置的环境变量:
echo    NODE_ENV=production
echo    PORT=3003
echo    IFLYTEK_APPID=27d422bd
echo    IFLYTEK_API_SECRET=NjRmZjM4NGUzZGFkNTUxZjM3NzQxYjJh
echo    IFLYTEK_API_KEY=f362096d765f0452321a6f4c51a5d735
echo.
echo 🔗 部署完成后，你将获得一个类似这样的访问地址:
echo    https://your-project-name.zeabur.app
echo.
echo 🎉 部署准备完成！
pause