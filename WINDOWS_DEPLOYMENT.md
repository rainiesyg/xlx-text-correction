# 🪟 Windows服务器部署指南

## 📋 Windows服务器部署方案

针对Windows服务器环境，我们提供以下几种部署方案：

### 🎯 推荐部署方案

| 部署方式 | 适用场景 | 复杂度 | 推荐指数 |
|---------|---------|--------|----------|
| [PM2 + IIS反向代理](#pm2--iis部署) | Windows服务器标准方案 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| [Docker Desktop](#docker-desktop部署) | 容器化部署 | ⭐⭐ | ⭐⭐⭐⭐ |
| [Windows服务](#windows服务部署) | 系统服务方式 | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| [手动部署](#手动部署) | 开发测试环境 | ⭐ | ⭐⭐⭐ |

## 🔧 方案一：PM2 + IIS部署 (推荐)

### 优势
- ✅ 进程监控和自动重启
- ✅ IIS反向代理，支持域名绑定
- ✅ Windows防火墙集成
- ✅ 系统日志集成
- ✅ 支持SSL证书

### 系统要求
- Windows Server 2016+ 或 Windows 10+
- IIS 10.0+
- Node.js 18+
- PowerShell 5.1+

### 部署步骤

#### 1. 安装必要软件

**安装Node.js：**
```powershell
# 下载并安装Node.js 18 LTS
# 访问 https://nodejs.org/zh-cn/download/
# 或使用Chocolatey
choco install nodejs
```

**启用IIS和相关功能：**
```powershell
# 以管理员身份运行PowerShell
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServer
Enable-WindowsOptionalFeature -Online -FeatureName IIS-CommonHttpFeatures
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpErrors
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpLogging
Enable-WindowsOptionalFeature -Online -FeatureName IIS-RequestFiltering
Enable-WindowsOptionalFeature -Online -FeatureName IIS-StaticContent
Enable-WindowsOptionalFeature -Online -FeatureName IIS-DefaultDocument
```

**安装URL重写模块：**
- 下载并安装 [URL Rewrite Module](https://www.iis.net/downloads/microsoft/url-rewrite)
- 下载并安装 [Application Request Routing](https://www.iis.net/downloads/microsoft/application-request-routing)

**安装PM2：**
```powershell
npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install
```

#### 2. 部署应用

**创建应用目录：**
```powershell
mkdir C:\inetpub\wwwroot\xinlianxin-text-correction
cd C:\inetpub\wwwroot\xinlianxin-text-correction
```

**克隆项目：**
```powershell
git clone https://github.com/rainiesyg/xlx-text-correction.git .
npm install --production
```

**配置环境变量：**
```powershell
copy .env.example .env
notepad .env  # 编辑配置文件
```

**启动PM2服务：**
```powershell
pm2 start ecosystem.config.js
pm2 save
```

#### 3. 配置IIS反向代理

**创建IIS站点：**
1. 打开IIS管理器
2. 右键"网站" → "添加网站"
3. 网站名称：xinlianxin-text-correction
4. 物理路径：C:\inetpub\wwwroot\xinlianxin-text-correction\public
5. 端口：80 (或其他端口)

**配置URL重写规则：**
在网站根目录创建 `web.config` 文件：
```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxyInboundRule1" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:3003/api/{R:1}" />
        </rule>
        <rule name="ReverseProxyInboundRule2" stopProcessing="true">
          <match url="^(?!api).*" />
          <action type="Rewrite" url="http://localhost:3003/{R:0}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

#### 4. 配置Windows防火墙
```powershell
# 允许端口3003
New-NetFirewallRule -DisplayName "Node.js App" -Direction Inbound -Protocol TCP -LocalPort 3003 -Action Allow

# 允许HTTP和HTTPS
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

## 🐳 方案二：Docker Desktop部署

### 优势
- ✅ 环境隔离
- ✅ 跨平台一致性
- ✅ 容器化管理
- ✅ 自动重启

### 部署步骤

#### 1. 安装Docker Desktop
- 下载并安装 [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
- 启用WSL 2后端（推荐）

#### 2. 部署应用
```powershell
# 克隆项目
git clone https://github.com/rainiesyg/xlx-text-correction.git
cd xlx-text-correction

# 配置环境变量
copy .env.example .env
notepad .env

# 启动服务
docker-compose up -d

# 查看状态
docker-compose ps
```

## 🔧 方案三：Windows服务部署

### 优势
- ✅ 系统服务级别运行
- ✅ 开机自启动
- ✅ 系统日志集成
- ✅ 服务管理界面

### 部署步骤

#### 1. 安装node-windows
```powershell
npm install -g node-windows
```

#### 2. 创建服务脚本
创建 `install-service.js`：
```javascript
var Service = require('node-windows').Service;

// 创建服务对象
var svc = new Service({
  name: 'XinLianXin Text Correction',
  description: '心连心文本纠错服务',
  script: 'C:\\path\\to\\your\\app\\server.js',
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ],
  env: {
    name: "NODE_ENV",
    value: "production"
  }
});

// 监听安装事件
svc.on('install', function(){
  svc.start();
});

// 安装服务
svc.install();
```

#### 3. 安装和启动服务
```powershell
node install-service.js
```

## 🔧 方案四：手动部署

### 适用场景
- 开发测试环境
- 临时部署
- 学习理解

### 部署步骤

#### 1. 准备环境
```powershell
# 安装Node.js
# 克隆项目
git clone https://github.com/rainiesyg/xlx-text-correction.git
cd xlx-text-correction
npm install --production
```

#### 2. 配置环境变量
```powershell
copy .env.example .env
notepad .env
```

#### 3. 启动应用
```powershell
# 直接启动
npm start

# 或后台运行（使用PM2）
npm install -g pm2
pm2 start server.js --name xinlianxin-app
```

## 🔧 环境变量配置

### Windows环境变量设置

**方法一：通过.env文件**
```env
PORT=3003
NODE_ENV=production
IFLYTEK_APPID=your_app_id
IFLYTEK_API_SECRET=your_api_secret
IFLYTEK_API_KEY=your_api_key
```

**方法二：系统环境变量**
```powershell
# 设置系统环境变量
[Environment]::SetEnvironmentVariable("NODE_ENV", "production", "Machine")
[Environment]::SetEnvironmentVariable("PORT", "3003", "Machine")
[Environment]::SetEnvironmentVariable("IFLYTEK_APPID", "your_app_id", "Machine")
```

**方法三：PowerShell会话变量**
```powershell
$env:NODE_ENV = "production"
$env:PORT = "3003"
$env:IFLYTEK_APPID = "your_app_id"
```

## 🔍 部署后验证

### 1. 检查服务状态
```powershell
# PM2部署
pm2 status

# Windows服务部署
Get-Service "XinLianXin Text Correction"

# Docker部署
docker-compose ps
```

### 2. 测试应用访问
```powershell
# 健康检查
Invoke-RestMethod -Uri "http://localhost:3003/api/health"

# 功能测试
$body = @{text="这是一个测试文本"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3003/api/correct" -Method Post -Body $body -ContentType "application/json"
```

### 3. 检查日志
```powershell
# PM2日志
pm2 logs

# Windows事件日志
Get-EventLog -LogName Application -Source "XinLianXin Text Correction" -Newest 10

# IIS日志
Get-Content "C:\inetpub\logs\LogFiles\W3SVC1\*.log" | Select-Object -Last 10
```

## 🚨 故障排除

### 常见问题

#### 1. 端口被占用
```powershell
# 查看端口占用
netstat -ano | findstr :3003

# 结束占用进程
taskkill /PID <PID> /F
```

#### 2. 权限问题
```powershell
# 给应用目录设置权限
icacls "C:\inetpub\wwwroot\xinlianxin-text-correction" /grant "IIS_IUSRS:(OI)(CI)F"
```

#### 3. 防火墙问题
```powershell
# 检查防火墙规则
Get-NetFirewallRule -DisplayName "*Node*"

# 临时关闭防火墙测试
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False
```

#### 4. IIS配置问题
- 确保安装了URL重写模块
- 检查应用程序池设置
- 验证web.config语法

## 📊 性能优化

### 1. IIS优化
```xml
<!-- web.config 性能优化 -->
<system.webServer>
  <urlCompression doDynamicCompression="true" doStaticCompression="true" />
  <staticContent>
    <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="7.00:00:00" />
  </staticContent>
</system.webServer>
```

### 2. Node.js优化
```powershell
# 增加内存限制
pm2 start server.js --node-args="--max-old-space-size=4096"

# 启用集群模式
pm2 start server.js -i max
```

### 3. 系统优化
```powershell
# 优化TCP设置
netsh int tcp set global autotuninglevel=normal
netsh int tcp set global chimney=enabled
```

## 🔐 安全配置

### 1. IIS安全设置
- 移除不必要的HTTP头
- 配置请求过滤
- 启用HTTPS重定向

### 2. Windows防火墙
```powershell
# 只允许特定IP访问
New-NetFirewallRule -DisplayName "Node.js App - Specific IP" -Direction Inbound -Protocol TCP -LocalPort 3003 -RemoteAddress "192.168.1.0/24" -Action Allow
```

### 3. SSL证书配置
- 使用IIS管理器绑定SSL证书
- 配置HTTPS重定向规则

## 📞 技术支持

### 管理命令速查

**PM2管理：**
```powershell
pm2 start ecosystem.config.js  # 启动
pm2 stop all                   # 停止
pm2 restart all                # 重启
pm2 logs                       # 查看日志
pm2 monit                      # 监控界面
```

**IIS管理：**
```powershell
iisreset                       # 重启IIS
appcmd list sites              # 列出站点
appcmd start site "site-name"  # 启动站点
```

**Docker管理：**
```powershell
docker-compose up -d           # 启动
docker-compose down            # 停止
docker-compose logs -f         # 查看日志
docker-compose restart         # 重启
```

---

**选择最适合您Windows服务器环境的部署方案，开始部署您的心连心文本纠错应用！** 🎉