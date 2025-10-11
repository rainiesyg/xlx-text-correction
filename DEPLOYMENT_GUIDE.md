# 🚀 服务器部署完整指南

## 📋 部署前检查清单

### 1. 服务器要求
- [ ] Linux服务器 (Ubuntu 18.04+ 推荐)
- [ ] Node.js 18+ 或 Docker 20.10+
- [ ] 至少 1GB RAM, 10GB 存储空间
- [ ] 开放端口：80, 443, 3003

### 2. 必需的配置信息
- [ ] 科大讯飞API密钥 (IFLYTEK_APPID, IFLYTEK_API_SECRET, IFLYTEK_API_KEY)
- [ ] 域名 (可选，用于HTTPS)
- [ ] SSL证书 (可选，用于HTTPS)

## 🐳 方案一：Docker容器化部署 (推荐)

### 优势
- ✅ 环境隔离，避免依赖冲突
- ✅ 自动重启和健康检查
- ✅ 包含Nginx反向代理
- ✅ 支持HTTPS和负载均衡
- ✅ 易于扩展和维护

### 部署步骤

#### 1. 服务器准备
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Docker和Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 重新登录以应用用户组更改
exit
```

#### 2. 部署应用
```bash
# 克隆项目
git clone https://github.com/rainiesyg/xlx-text-correction.git
cd xlx-text-correction

# 配置环境变量
cp .env.example .env
nano .env  # 编辑配置文件

# 启动服务
docker-compose up -d

# 查看服务状态
docker-compose ps
docker-compose logs -f
```

#### 3. 配置域名和HTTPS (可选)
```bash
# 如果有域名，修改nginx.conf
nano nginx.conf

# 重启Nginx
docker-compose restart nginx
```

### 常用管理命令
```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f app

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 更新应用
git pull
docker-compose up -d --build
```

## 🔧 方案二：PM2进程管理部署

### 优势
- ✅ 传统部署方式，易于理解
- ✅ 进程监控和自动重启
- ✅ 支持集群模式
- ✅ 详细的日志管理

### 部署步骤

#### 1. 服务器环境准备
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装PM2
npm install -g pm2

# 安装Nginx (可选，用于反向代理)
sudo apt install -y nginx
```

#### 2. 部署应用
```bash
# 创建应用目录
sudo mkdir -p /var/www/xinlianxin-text-correction
sudo chown $USER:$USER /var/www/xinlianxin-text-correction

# 克隆项目
cd /var/www/xinlianxin-text-correction
git clone https://github.com/rainiesyg/xlx-text-correction.git .

# 安装依赖
npm install --production

# 配置环境变量
cp .env.example .env
nano .env  # 编辑配置文件

# 启动应用
pm2 start ecosystem.config.js

# 保存PM2配置
pm2 save

# 设置开机自启
pm2 startup
# 按照提示执行命令
```

#### 3. 配置Nginx反向代理 (推荐)
```bash
# 创建Nginx配置
sudo nano /etc/nginx/sites-available/xinlianxin-text-correction

# 添加以下配置：
server {
    listen 80;
    server_name your-domain.com;  # 替换为您的域名

    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# 启用站点
sudo ln -s /etc/nginx/sites-available/xinlianxin-text-correction /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 常用管理命令
```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs

# 重启应用
pm2 restart all

# 停止应用
pm2 stop all

# 更新应用
cd /var/www/xinlianxin-text-correction
git pull
npm install --production
pm2 restart all
```

## ☁️ 方案三：Zeabur云部署 (最简单)

### 优势
- ✅ 零配置，自动化程度最高
- ✅ 自动HTTPS和CDN
- ✅ 全球部署节点
- ✅ 自动扩容

### 部署步骤

#### 1. 准备代码
```bash
# 确保代码已推送到GitHub
git add .
git commit -m "准备云部署"
git push origin main
```

#### 2. Zeabur部署
1. 访问 [Zeabur控制台](https://zeabur.com)
2. 使用GitHub账号登录
3. 创建新项目
4. 选择您的代码仓库
5. 配置环境变量：
   ```
   NODE_ENV=production
   PORT=3003
   IFLYTEK_APPID=your_app_id
   IFLYTEK_API_SECRET=your_api_secret
   IFLYTEK_API_KEY=your_api_key
   ```
6. 点击部署

#### 3. 配置域名 (可选)
- 在Zeabur控制台绑定自定义域名
- 自动配置HTTPS证书

## 🔧 环境变量配置

### 必需配置
```env
# 服务器配置
PORT=3003
NODE_ENV=production

# 科大讯飞API配置 (必需)
IFLYTEK_APPID=your_app_id
IFLYTEK_API_SECRET=your_api_secret
IFLYTEK_API_KEY=your_api_key
```

### 可选配置
```env
# 文件上传配置
UPLOAD_MAX_SIZE=10485760
UPLOAD_DIR=./uploads

# 缓存配置
CACHE_TTL=300000
CACHE_MAX_SIZE=100

# 安全配置
CORS_ORIGIN=*
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# 日志配置
LOG_LEVEL=info
LOG_FORMAT=combined
```

## 🔍 部署后验证

### 1. 健康检查
```bash
# 检查服务状态
curl http://your-server:3003/api/health

# 预期响应
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "memory": {...},
  "dependencies": {...}
}
```

### 2. 功能测试
```bash
# 测试文本纠错API
curl -X POST http://your-server:3003/api/correct \
  -H "Content-Type: application/json" \
  -d '{"text": "这是一个测试文本"}'
```

### 3. 性能监控
- 查看CPU和内存使用情况
- 监控响应时间
- 检查错误日志

## 🚨 故障排除

### 常见问题

#### 1. 端口被占用
```bash
# 查看端口占用
sudo netstat -tlnp | grep :3003

# 杀死占用进程
sudo kill -9 <PID>
```

#### 2. 权限问题
```bash
# 修改文件权限
sudo chown -R $USER:$USER /var/www/xinlianxin-text-correction
chmod -R 755 /var/www/xinlianxin-text-correction
```

#### 3. 内存不足
```bash
# 查看内存使用
free -h

# 创建交换文件
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### 4. API密钥错误
- 检查环境变量是否正确设置
- 验证科大讯飞API密钥是否有效
- 查看应用日志获取详细错误信息

## 📊 监控和维护

### 1. 日志管理
```bash
# Docker部署日志
docker-compose logs -f app

# PM2部署日志
pm2 logs

# 系统日志
sudo journalctl -u nginx -f
```

### 2. 备份策略
```bash
# 备份应用数据
tar -czf backup-$(date +%Y%m%d).tar.gz /var/www/xinlianxin-text-correction

# 备份数据库 (如果有)
# mysqldump -u user -p database > backup.sql
```

### 3. 更新流程
```bash
# 1. 备份当前版本
cp -r /var/www/xinlianxin-text-correction /var/www/xinlianxin-text-correction.backup

# 2. 拉取最新代码
cd /var/www/xinlianxin-text-correction
git pull origin main

# 3. 更新依赖
npm install --production

# 4. 重启服务
# Docker: docker-compose up -d --build
# PM2: pm2 restart all
```

## 🔐 安全建议

1. **防火墙配置**
   ```bash
   sudo ufw allow ssh
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```

2. **SSL证书** (推荐使用Let's Encrypt)
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

3. **定期更新**
   - 定期更新系统和依赖包
   - 监控安全漏洞
   - 备份重要数据

4. **访问控制**
   - 使用强密码
   - 配置SSH密钥认证
   - 限制root用户访问

## 📞 技术支持

如果在部署过程中遇到问题，请：

1. 查看应用日志获取错误信息
2. 检查服务器资源使用情况
3. 验证网络连接和防火墙设置
4. 确认环境变量配置正确

---

**部署成功后，您的心连心文本纠错应用将在服务器上稳定运行！** 🎉