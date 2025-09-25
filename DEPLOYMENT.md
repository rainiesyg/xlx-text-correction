# 🚀 项目部署指南

本文档详细介绍了将项目部署到服务器的多种方式。

## 📋 部署方式概览

| 部署方式 | 适用场景 | 复杂度 | 推荐指数 |
|---------|---------|--------|----------|
| [Zeabur云部署](#zeabur云部署) | 快速部署、零配置 | ⭐ | ⭐⭐⭐⭐⭐ |
| [Docker部署](#docker容器化部署) | 容器化、易扩展 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| [PM2部署](#pm2进程管理部署) | 传统服务器 | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| [手动部署](#手动部署) | 学习理解 | ⭐⭐⭐⭐ | ⭐⭐⭐ |

## 🌐 Zeabur云部署

最简单的部署方式，零配置，自动化程度最高。

### 快速开始
1. 推送代码到GitHub/GitLab
2. 登录 [Zeabur控制台](https://zeabur.com)
3. 创建新项目，选择代码仓库
4. 配置环境变量
5. 一键部署

详细步骤请参考 [README.md](./README.md#zeabur云端部署)

## 🐳 Docker容器化部署

推荐的生产环境部署方式，具有良好的隔离性和可扩展性。

### 前置要求
- Docker 20.10+
- Docker Compose 2.0+

### 快速部署
```bash
# 1. 克隆项目
git clone <your-repo-url>
cd xinlianxin-text-correction

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 3. 一键部署
chmod +x deploy-docker.sh
./deploy-docker.sh start
```

### Docker命令详解
```bash
# 构建镜像
./deploy-docker.sh build

# 启动服务
./deploy-docker.sh start

# 查看状态
./deploy-docker.sh status

# 查看日志
./deploy-docker.sh logs

# 重启服务
./deploy-docker.sh restart

# 停止服务
./deploy-docker.sh stop

# 清理资源
./deploy-docker.sh clean
```

### 服务访问
- 应用地址: http://localhost:3003
- 健康检查: http://localhost:3003/api/health
- Nginx代理: http://localhost:80

## ⚙️ PM2进程管理部署

适用于传统Linux服务器，提供进程管理和监控功能。

### 前置要求
- Linux服务器 (Ubuntu 18.04+)
- Node.js 18+
- PM2进程管理器

### 自动部署
```bash
# 1. 上传部署脚本到服务器
scp deploy-server.sh user@your-server:/tmp/

# 2. 登录服务器执行部署
ssh user@your-server
sudo chmod +x /tmp/deploy-server.sh
sudo /tmp/deploy-server.sh production
```

### 手动部署步骤
```bash
# 1. 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 2. 安装PM2
sudo npm install -g pm2

# 3. 克隆项目
git clone <your-repo-url> /var/www/xinlianxin-text-correction
cd /var/www/xinlianxin-text-correction

# 4. 安装依赖
npm ci --only=production

# 5. 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 6. 启动应用
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### PM2常用命令
```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs xinlianxin-text-correction

# 重启应用
pm2 restart xinlianxin-text-correction

# 停止应用
pm2 stop xinlianxin-text-correction

# 删除应用
pm2 delete xinlianxin-text-correction

# 监控面板
pm2 monit
```

## 🔧 手动部署

最基础的部署方式，适合学习和理解部署过程。

### 部署步骤
```bash
# 1. 准备服务器环境
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs npm nginx

# 2. 克隆项目
git clone <your-repo-url> /var/www/xinlianxin-text-correction
cd /var/www/xinlianxin-text-correction

# 3. 安装依赖
npm install --production

# 4. 配置环境变量
cp .env.example .env
# 编辑配置文件

# 5. 配置Nginx
sudo cp nginx.conf /etc/nginx/sites-available/xinlianxin-text-correction
sudo ln -s /etc/nginx/sites-available/xinlianxin-text-correction /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# 6. 启动应用
nohup npm start > logs/app.log 2>&1 &
```

## 🔐 环境变量配置

所有部署方式都需要配置以下环境变量：

```bash
# 应用配置
NODE_ENV=production
PORT=3003

# 科大讯飞API配置
IFLYTEK_APPID=your_app_id
IFLYTEK_API_SECRET=your_api_secret
IFLYTEK_API_KEY=your_api_key

# 文件上传配置
UPLOAD_MAX_SIZE=50MB
UPLOAD_ALLOWED_TYPES=txt,doc,docx,pdf

# 缓存配置
CACHE_TTL=3600
CACHE_MAX_SIZE=100

# 安全配置
CORS_ORIGIN=*
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# 日志配置
LOG_LEVEL=info
LOG_MAX_SIZE=10MB
LOG_MAX_FILES=5
```

## 🌐 域名和SSL配置

### 域名绑定
1. 将域名A记录指向服务器IP
2. 修改Nginx配置中的`server_name`
3. 重启Nginx服务

### SSL证书配置
```bash
# 使用Let's Encrypt免费证书
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
sudo systemctl reload nginx
```

## 📊 监控和维护

### 健康检查
- 应用健康检查: `GET /api/health`
- 状态检查: `GET /api/status`

### 日志管理
```bash
# PM2日志
pm2 logs

# Docker日志
docker-compose logs -f

# Nginx日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 性能监控
```bash
# 系统资源
htop
df -h
free -h

# PM2监控
pm2 monit

# Docker监控
docker stats
```

## 🚨 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   sudo lsof -i :3003
   sudo kill -9 <PID>
   ```

2. **权限问题**
   ```bash
   sudo chown -R www-data:www-data /var/www/xinlianxin-text-correction
   ```

3. **内存不足**
   ```bash
   # 增加swap空间
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

4. **Nginx配置错误**
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

### 日志分析
```bash
# 应用错误日志
tail -f logs/error.log

# 访问日志分析
sudo tail -f /var/log/nginx/access.log | grep "POST\|PUT\|DELETE"

# 系统日志
sudo journalctl -u nginx -f
```

## 📚 相关文档

- [项目架构文档](./ARCHITECTURE.md)
- [API文档](./README.md#api接口)
- [开发指南](./README.md#本地开发)
- [Zeabur部署文档](https://docs.zeabur.com)
- [Docker官方文档](https://docs.docker.com)
- [PM2官方文档](https://pm2.keymetrics.io)

## 🆘 获取帮助

如果在部署过程中遇到问题，可以：

1. 查看项目Issues
2. 检查服务器日志
3. 参考官方文档
4. 联系技术支持

---

**祝您部署顺利！** 🎉