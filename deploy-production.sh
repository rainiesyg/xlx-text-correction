#!/bin/bash

# 生产环境部署脚本
# 使用方法: ./deploy-production.sh [docker|pm2|manual]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
APP_NAME="xinlianxin-text-correction"
APP_DIR="/var/www/$APP_NAME"
REPO_URL="https://github.com/rainiesyg/xlx-text-correction.git"
NODE_VERSION="18"
DEPLOYMENT_TYPE=${1:-docker}

echo -e "${BLUE}🚀 开始部署 $APP_NAME 到生产环境...${NC}"
echo -e "${BLUE}📋 部署方式: $DEPLOYMENT_TYPE${NC}"
echo ""

# 检查系统要求
check_requirements() {
    echo -e "${YELLOW}🔍 检查系统要求...${NC}"
    
    # 检查操作系统
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        echo -e "${RED}❌ 此脚本仅支持Linux系统${NC}"
        exit 1
    fi
    
    # 检查是否为root用户或有sudo权限
    if [ "$EUID" -ne 0 ] && ! sudo -n true 2>/dev/null; then
        echo -e "${RED}❌ 需要root权限或sudo权限${NC}"
        exit 1
    fi
    
    # 检查网络连接
    if ! ping -c 1 google.com &> /dev/null; then
        echo -e "${RED}❌ 网络连接失败${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 系统要求检查通过${NC}"
}

# 更新系统
update_system() {
    echo -e "${YELLOW}📦 更新系统包...${NC}"
    sudo apt update && sudo apt upgrade -y
    sudo apt install -y curl git wget unzip
    echo -e "${GREEN}✅ 系统更新完成${NC}"
}

# Docker部署
deploy_docker() {
    echo -e "${YELLOW}🐳 开始Docker部署...${NC}"
    
    # 安装Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}📦 安装Docker...${NC}"
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        rm get-docker.sh
    fi
    
    # 安装Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${YELLOW}📦 安装Docker Compose...${NC}"
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
    fi
    
    # 创建应用目录
    sudo mkdir -p $APP_DIR
    sudo chown $USER:$USER $APP_DIR
    
    # 克隆或更新代码
    if [ -d "$APP_DIR/.git" ]; then
        echo -e "${YELLOW}🔄 更新代码...${NC}"
        cd $APP_DIR
        git pull origin main
    else
        echo -e "${YELLOW}📥 克隆代码...${NC}"
        git clone $REPO_URL $APP_DIR
        cd $APP_DIR
    fi
    
    # 配置环境变量
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}⚙️  配置环境变量...${NC}"
        cp .env.example .env
        echo -e "${RED}⚠️  请编辑 .env 文件配置API密钥${NC}"
        echo -e "${YELLOW}按任意键继续编辑环境变量...${NC}"
        read -n 1
        nano .env
    fi
    
    # 启动服务
    echo -e "${YELLOW}🚀 启动Docker服务...${NC}"
    docker-compose down 2>/dev/null || true
    docker-compose up -d --build
    
    # 等待服务启动
    echo -e "${YELLOW}⏳ 等待服务启动...${NC}"
    sleep 30
    
    # 健康检查
    if curl -f http://localhost:3003/api/health &> /dev/null; then
        echo -e "${GREEN}✅ Docker部署成功！${NC}"
        echo -e "${GREEN}🌐 访问地址: http://$(curl -s ifconfig.me):3003${NC}"
    else
        echo -e "${RED}❌ 服务启动失败，请检查日志${NC}"
        docker-compose logs
        exit 1
    fi
}

# PM2部署
deploy_pm2() {
    echo -e "${YELLOW}🔧 开始PM2部署...${NC}"
    
    # 安装Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${YELLOW}📦 安装Node.js $NODE_VERSION...${NC}"
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # 安装PM2
    if ! command -v pm2 &> /dev/null; then
        echo -e "${YELLOW}📦 安装PM2...${NC}"
        sudo npm install -g pm2
    fi
    
    # 安装Nginx
    if ! command -v nginx &> /dev/null; then
        echo -e "${YELLOW}📦 安装Nginx...${NC}"
        sudo apt install -y nginx
    fi
    
    # 创建应用目录
    sudo mkdir -p $APP_DIR
    sudo chown $USER:$USER $APP_DIR
    
    # 克隆或更新代码
    if [ -d "$APP_DIR/.git" ]; then
        echo -e "${YELLOW}🔄 更新代码...${NC}"
        cd $APP_DIR
        git pull origin main
    else
        echo -e "${YELLOW}📥 克隆代码...${NC}"
        git clone $REPO_URL $APP_DIR
        cd $APP_DIR
    fi
    
    # 安装依赖
    echo -e "${YELLOW}📦 安装依赖...${NC}"
    npm install --production
    
    # 配置环境变量
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}⚙️  配置环境变量...${NC}"
        cp .env.example .env
        echo -e "${RED}⚠️  请编辑 .env 文件配置API密钥${NC}"
        echo -e "${YELLOW}按任意键继续编辑环境变量...${NC}"
        read -n 1
        nano .env
    fi
    
    # 启动PM2
    echo -e "${YELLOW}🚀 启动PM2服务...${NC}"
    pm2 delete $APP_NAME 2>/dev/null || true
    pm2 start ecosystem.config.js
    pm2 save
    
    # 设置开机自启
    pm2 startup | tail -1 | sudo bash
    
    # 配置Nginx
    echo -e "${YELLOW}⚙️  配置Nginx...${NC}"
    sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    
    sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t && sudo systemctl restart nginx
    
    # 健康检查
    sleep 10
    if curl -f http://localhost:3003/api/health &> /dev/null; then
        echo -e "${GREEN}✅ PM2部署成功！${NC}"
        echo -e "${GREEN}🌐 访问地址: http://$(curl -s ifconfig.me)${NC}"
    else
        echo -e "${RED}❌ 服务启动失败，请检查日志${NC}"
        pm2 logs
        exit 1
    fi
}

# 手动部署
deploy_manual() {
    echo -e "${YELLOW}🔧 开始手动部署...${NC}"
    
    # 安装Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${YELLOW}📦 安装Node.js $NODE_VERSION...${NC}"
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # 创建应用目录
    sudo mkdir -p $APP_DIR
    sudo chown $USER:$USER $APP_DIR
    
    # 克隆或更新代码
    if [ -d "$APP_DIR/.git" ]; then
        echo -e "${YELLOW}🔄 更新代码...${NC}"
        cd $APP_DIR
        git pull origin main
    else
        echo -e "${YELLOW}📥 克隆代码...${NC}"
        git clone $REPO_URL $APP_DIR
        cd $APP_DIR
    fi
    
    # 安装依赖
    echo -e "${YELLOW}📦 安装依赖...${NC}"
    npm install --production
    
    # 配置环境变量
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}⚙️  配置环境变量...${NC}"
        cp .env.example .env
        echo -e "${RED}⚠️  请编辑 .env 文件配置API密钥${NC}"
        echo -e "${YELLOW}按任意键继续编辑环境变量...${NC}"
        read -n 1
        nano .env
    fi
    
    echo -e "${GREEN}✅ 手动部署准备完成！${NC}"
    echo -e "${YELLOW}🚀 启动应用: cd $APP_DIR && npm start${NC}"
    echo -e "${YELLOW}🌐 访问地址: http://$(curl -s ifconfig.me):3003${NC}"
}

# 配置防火墙
setup_firewall() {
    echo -e "${YELLOW}🔥 配置防火墙...${NC}"
    
    if command -v ufw &> /dev/null; then
        sudo ufw --force reset
        sudo ufw default deny incoming
        sudo ufw default allow outgoing
        sudo ufw allow ssh
        sudo ufw allow 80
        sudo ufw allow 443
        sudo ufw allow 3003
        sudo ufw --force enable
        echo -e "${GREEN}✅ 防火墙配置完成${NC}"
    else
        echo -e "${YELLOW}⚠️  UFW未安装，跳过防火墙配置${NC}"
    fi
}

# 显示部署后信息
show_deployment_info() {
    echo ""
    echo -e "${GREEN}🎉 部署完成！${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}📋 部署信息:${NC}"
    echo -e "   应用名称: $APP_NAME"
    echo -e "   部署方式: $DEPLOYMENT_TYPE"
    echo -e "   应用目录: $APP_DIR"
    echo -e "   访问地址: http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')"
    echo ""
    echo -e "${GREEN}🔧 管理命令:${NC}"
    
    case $DEPLOYMENT_TYPE in
        "docker")
            echo -e "   查看状态: cd $APP_DIR && docker-compose ps"
            echo -e "   查看日志: cd $APP_DIR && docker-compose logs -f"
            echo -e "   重启服务: cd $APP_DIR && docker-compose restart"
            echo -e "   停止服务: cd $APP_DIR && docker-compose down"
            ;;
        "pm2")
            echo -e "   查看状态: pm2 status"
            echo -e "   查看日志: pm2 logs"
            echo -e "   重启服务: pm2 restart $APP_NAME"
            echo -e "   停止服务: pm2 stop $APP_NAME"
            ;;
        "manual")
            echo -e "   启动应用: cd $APP_DIR && npm start"
            echo -e "   后台运行: cd $APP_DIR && nohup npm start > app.log 2>&1 &"
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}📚 更多信息请查看: $APP_DIR/DEPLOYMENT_GUIDE.md${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 主函数
main() {
    case $DEPLOYMENT_TYPE in
        "docker")
            check_requirements
            update_system
            deploy_docker
            setup_firewall
            show_deployment_info
            ;;
        "pm2")
            check_requirements
            update_system
            deploy_pm2
            setup_firewall
            show_deployment_info
            ;;
        "manual")
            check_requirements
            update_system
            deploy_manual
            setup_firewall
            show_deployment_info
            ;;
        *)
            echo -e "${RED}❌ 不支持的部署方式: $DEPLOYMENT_TYPE${NC}"
            echo -e "${YELLOW}支持的部署方式: docker, pm2, manual${NC}"
            echo -e "${YELLOW}使用方法: $0 [docker|pm2|manual]${NC}"
            exit 1
            ;;
    esac
}

# 执行主函数
main