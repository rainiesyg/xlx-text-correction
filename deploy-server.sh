#!/bin/bash

# 服务器部署脚本
# 使用方法: ./deploy-server.sh [production|staging]

set -e

# 配置变量
APP_NAME="xinlianxin-text-correction"
APP_DIR="/var/www/$APP_NAME"
REPO_URL="https://github.com/your-username/your-repo.git"
NODE_VERSION="18"
ENVIRONMENT=${1:-production}

echo "🚀 开始部署 $APP_NAME 到 $ENVIRONMENT 环境..."

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    echo "❌ 请使用root权限运行此脚本"
    exit 1
fi

# 更新系统包
echo "📦 更新系统包..."
apt update && apt upgrade -y

# 安装必要的软件
echo "🔧 安装必要软件..."
apt install -y curl git nginx

# 安装Node.js
echo "📥 安装Node.js $NODE_VERSION..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt install -y nodejs

# 安装PM2
echo "⚙️ 安装PM2..."
npm install -g pm2

# 创建应用目录
echo "📁 创建应用目录..."
mkdir -p $APP_DIR
cd $APP_DIR

# 克隆或更新代码
if [ -d ".git" ]; then
    echo "🔄 更新代码..."
    git pull origin main
else
    echo "📥 克隆代码..."
    git clone $REPO_URL .
fi

# 安装依赖
echo "📦 安装依赖..."
npm ci --only=production

# 创建必要目录
mkdir -p logs uploads

# 设置权限
chown -R www-data:www-data $APP_DIR

# 配置环境变量
echo "🔐 配置环境变量..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "⚠️ 请编辑 .env 文件配置正确的环境变量"
fi

# 配置Nginx
echo "🌐 配置Nginx..."
cp nginx.conf /etc/nginx/sites-available/$APP_NAME
ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 测试Nginx配置
nginx -t

# 启动或重启服务
echo "🔄 启动服务..."
pm2 delete $APP_NAME 2>/dev/null || true
pm2 start ecosystem.config.js --env $ENVIRONMENT
pm2 save
pm2 startup

# 重启Nginx
systemctl restart nginx
systemctl enable nginx

# 配置防火墙
echo "🔥 配置防火墙..."
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

echo "✅ 部署完成！"
echo "🌐 应用访问地址: http://your-server-ip"
echo "📊 PM2状态: pm2 status"
echo "📝 查看日志: pm2 logs $APP_NAME"
echo "🔄 重启应用: pm2 restart $APP_NAME"