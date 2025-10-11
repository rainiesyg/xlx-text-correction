@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: 心连心文本纠错 - Windows自动化部署脚本
:: 支持PM2、Docker、Windows服务等多种部署方式

echo.
echo ========================================
echo   心连心文本纠错 - Windows部署脚本
echo ========================================
echo.

:: 检查管理员权限
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [错误] 请以管理员身份运行此脚本！
    echo 右键点击脚本，选择"以管理员身份运行"
    pause
    exit /b 1
)

:: 显示部署选项
echo 请选择部署方式：
echo.
echo [1] PM2 + IIS 部署 (推荐)
echo [2] Docker Desktop 部署
echo [3] Windows 服务部署
echo [4] 手动部署 (开发测试)
echo [5] 仅安装依赖
echo [0] 退出
echo.
set /p choice="请输入选择 (1-5): "

if "%choice%"=="1" goto :deploy_pm2_iis
if "%choice%"=="2" goto :deploy_docker
if "%choice%"=="3" goto :deploy_windows_service
if "%choice%"=="4" goto :deploy_manual
if "%choice%"=="5" goto :install_dependencies
if "%choice%"=="0" goto :exit
echo [错误] 无效选择，请重新运行脚本
pause
exit /b 1

:deploy_pm2_iis
echo.
echo ========================================
echo   PM2 + IIS 部署
echo ========================================
echo.

:: 检查Node.js
call :check_nodejs
if !errorlevel! neq 0 goto :install_nodejs

:: 检查IIS
call :check_iis
if !errorlevel! neq 0 call :install_iis

:: 安装PM2
call :install_pm2

:: 部署应用
call :deploy_app

:: 配置IIS
call :configure_iis

:: 配置防火墙
call :configure_firewall

echo.
echo [成功] PM2 + IIS 部署完成！
echo 访问地址: http://localhost
echo 管理命令: pm2 status, pm2 logs
goto :end

:deploy_docker
echo.
echo ========================================
echo   Docker Desktop 部署
echo ========================================
echo.

:: 检查Docker
docker --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [错误] 未检测到Docker Desktop
    echo 请先安装Docker Desktop: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

:: 检查docker-compose
docker-compose --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [错误] 未检测到docker-compose
    echo 请确保Docker Desktop已正确安装
    pause
    exit /b 1
)

:: 配置环境变量
call :setup_env

:: 启动Docker服务
echo [信息] 启动Docker服务...
docker-compose up -d

if %errorLevel% neq 0 (
    echo [错误] Docker服务启动失败
    pause
    exit /b 1
)

echo.
echo [成功] Docker部署完成！
echo 访问地址: http://localhost:8080
echo 管理命令: docker-compose ps, docker-compose logs
goto :end

:deploy_windows_service
echo.
echo ========================================
echo   Windows 服务部署
echo ========================================
echo.

:: 检查Node.js
call :check_nodejs
if !errorlevel! neq 0 goto :install_nodejs

:: 安装node-windows
echo [信息] 安装node-windows...
npm install -g node-windows

:: 创建服务安装脚本
call :create_service_script

:: 安装服务
echo [信息] 安装Windows服务...
node install-service.js

echo.
echo [成功] Windows服务部署完成！
echo 服务名称: XinLianXin Text Correction
echo 管理方式: 服务管理器 (services.msc)
goto :end

:deploy_manual
echo.
echo ========================================
echo   手动部署
echo ========================================
echo.

:: 检查Node.js
call :check_nodejs
if !errorlevel! neq 0 goto :install_nodejs

:: 安装依赖
call :install_app_dependencies

:: 配置环境变量
call :setup_env

:: 启动应用
echo [信息] 启动应用...
echo 使用以下命令启动应用:
echo   npm start
echo 或使用PM2:
echo   npm install -g pm2
echo   pm2 start server.js --name xinlianxin-app

echo.
echo [成功] 手动部署准备完成！
echo 访问地址: http://localhost:3003
goto :end

:install_dependencies
echo.
echo ========================================
echo   安装系统依赖
echo ========================================
echo.

call :check_nodejs
if !errorlevel! neq 0 call :install_nodejs

call :check_git
if !errorlevel! neq 0 call :install_git

call :install_app_dependencies

echo.
echo [成功] 依赖安装完成！
goto :end

:: ========================================
:: 功能函数
:: ========================================

:check_nodejs
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [警告] 未检测到Node.js
    exit /b 1
)
echo [信息] Node.js 已安装
exit /b 0

:install_nodejs
echo [信息] 正在安装Node.js...
echo 请手动下载并安装Node.js 18 LTS版本
echo 下载地址: https://nodejs.org/zh-cn/download/
echo.
echo 安装完成后请重新运行此脚本
pause
exit /b 1

:check_git
git --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [警告] 未检测到Git
    exit /b 1
)
echo [信息] Git 已安装
exit /b 0

:install_git
echo [信息] 请安装Git...
echo 下载地址: https://git-scm.com/download/win
pause
exit /b 1

:check_iis
powershell -Command "Get-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole | Where-Object {$_.State -eq 'Enabled'}" >nul 2>&1
if %errorLevel% neq 0 (
    echo [警告] IIS未启用
    exit /b 1
)
echo [信息] IIS 已启用
exit /b 0

:install_iis
echo [信息] 启用IIS功能...
powershell -Command "Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole -All"
powershell -Command "Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServer -All"
powershell -Command "Enable-WindowsOptionalFeature -Online -FeatureName IIS-CommonHttpFeatures -All"
powershell -Command "Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpErrors -All"
powershell -Command "Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpLogging -All"
powershell -Command "Enable-WindowsOptionalFeature -Online -FeatureName IIS-RequestFiltering -All"
powershell -Command "Enable-WindowsOptionalFeature -Online -FeatureName IIS-StaticContent -All"
powershell -Command "Enable-WindowsOptionalFeature -Online -FeatureName IIS-DefaultDocument -All"

echo [信息] 请手动安装以下IIS模块:
echo 1. URL Rewrite Module: https://www.iis.net/downloads/microsoft/url-rewrite
echo 2. Application Request Routing: https://www.iis.net/downloads/microsoft/application-request-routing
echo.
echo 安装完成后按任意键继续...
pause
exit /b 0

:install_pm2
echo [信息] 安装PM2...
npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install
exit /b 0

:deploy_app
echo [信息] 部署应用到 C:\inetpub\wwwroot\xinlianxin-text-correction...

if not exist "C:\inetpub\wwwroot" mkdir "C:\inetpub\wwwroot"
cd /d "C:\inetpub\wwwroot"

if exist "xinlianxin-text-correction" (
    echo [信息] 更新现有应用...
    cd xinlianxin-text-correction
    git pull
) else (
    echo [信息] 克隆新应用...
    git clone https://github.com/rainiesyg/xlx-text-correction.git xinlianxin-text-correction
    cd xinlianxin-text-correction
)

call :install_app_dependencies
call :setup_env

echo [信息] 启动PM2服务...
pm2 start ecosystem.config.js 2>nul || pm2 start server.js --name xinlianxin-app
pm2 save
exit /b 0

:install_app_dependencies
echo [信息] 安装应用依赖...
if exist "package.json" (
    npm install --production
) else (
    echo [错误] 未找到package.json文件
    exit /b 1
)
exit /b 0

:setup_env
echo [信息] 配置环境变量...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env"
        echo [信息] 已创建.env文件，请编辑配置您的API密钥
        echo.
        echo 请编辑.env文件，配置以下参数:
        echo - IFLYTEK_APPID: 您的讯飞APPID
        echo - IFLYTEK_API_SECRET: 您的讯飞API密钥
        echo - IFLYTEK_API_KEY: 您的讯飞API Key
        echo.
        set /p edit_env="是否现在编辑.env文件? (y/n): "
        if /i "!edit_env!"=="y" notepad .env
    ) else (
        echo [错误] 未找到.env.example文件
    )
)
exit /b 0

:configure_iis
echo [信息] 配置IIS站点...

:: 创建web.config
echo ^<?xml version="1.0" encoding="utf-8"?^> > public\web.config
echo ^<configuration^> >> public\web.config
echo   ^<system.webServer^> >> public\web.config
echo     ^<rewrite^> >> public\web.config
echo       ^<rules^> >> public\web.config
echo         ^<rule name="ReverseProxyInboundRule1" stopProcessing="true"^> >> public\web.config
echo           ^<match url="^^api/(.*)" /^> >> public\web.config
echo           ^<action type="Rewrite" url="http://localhost:3003/api/{R:1}" /^> >> public\web.config
echo         ^</rule^> >> public\web.config
echo         ^<rule name="ReverseProxyInboundRule2" stopProcessing="true"^> >> public\web.config
echo           ^<match url="^^(?!api).*" /^> >> public\web.config
echo           ^<action type="Rewrite" url="http://localhost:3003/{R:0}" /^> >> public\web.config
echo         ^</rule^> >> public\web.config
echo       ^</rules^> >> public\web.config
echo     ^</rewrite^> >> public\web.config
echo   ^</system.webServer^> >> public\web.config
echo ^</configuration^> >> public\web.config

echo [信息] 请手动在IIS管理器中创建站点:
echo 1. 打开IIS管理器
echo 2. 右键"网站" → "添加网站"
echo 3. 网站名称: xinlianxin-text-correction
echo 4. 物理路径: C:\inetpub\wwwroot\xinlianxin-text-correction\public
echo 5. 端口: 80
echo.
echo 配置完成后按任意键继续...
pause
exit /b 0

:configure_firewall
echo [信息] 配置Windows防火墙...
powershell -Command "New-NetFirewallRule -DisplayName 'Node.js App' -Direction Inbound -Protocol TCP -LocalPort 3003 -Action Allow" >nul 2>&1
powershell -Command "New-NetFirewallRule -DisplayName 'HTTP' -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow" >nul 2>&1
powershell -Command "New-NetFirewallRule -DisplayName 'HTTPS' -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow" >nul 2>&1
echo [信息] 防火墙规则已配置
exit /b 0

:create_service_script
echo [信息] 创建Windows服务安装脚本...
echo var Service = require('node-windows').Service; > install-service.js
echo. >> install-service.js
echo var svc = new Service({ >> install-service.js
echo   name: 'XinLianXin Text Correction', >> install-service.js
echo   description: '心连心文本纠错服务', >> install-service.js
echo   script: '%CD%\\server.js', >> install-service.js
echo   nodeOptions: [ >> install-service.js
echo     '--harmony', >> install-service.js
echo     '--max_old_space_size=4096' >> install-service.js
echo   ], >> install-service.js
echo   env: { >> install-service.js
echo     name: "NODE_ENV", >> install-service.js
echo     value: "production" >> install-service.js
echo   } >> install-service.js
echo }); >> install-service.js
echo. >> install-service.js
echo svc.on('install', function(){ >> install-service.js
echo   svc.start(); >> install-service.js
echo }); >> install-service.js
echo. >> install-service.js
echo svc.install(); >> install-service.js
exit /b 0

:end
echo.
echo ========================================
echo   部署完成
echo ========================================
echo.
echo 应用信息:
echo - 项目目录: %CD%
echo - 配置文件: .env
echo - 日志目录: logs/
echo.
echo 常用命令:
echo - 查看状态: pm2 status
echo - 查看日志: pm2 logs
echo - 重启应用: pm2 restart all
echo.
echo 如需技术支持，请查看 WINDOWS_DEPLOYMENT.md 文档
echo.

:exit
pause
exit /b 0