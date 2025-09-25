#!/bin/bash

# Docker部署脚本
# 使用方法: ./deploy-docker.sh [build|start|stop|restart|logs]

set -e

APP_NAME="xinlianxin-text-correction"
DOCKER_IMAGE="$APP_NAME:latest"
ACTION=${1:-start}

echo "🐳 Docker部署 - $ACTION"

case $ACTION in
    "build")
        echo "🔨 构建Docker镜像..."
        docker build -t $DOCKER_IMAGE .
        echo "✅ 镜像构建完成"
        ;;
    
    "start")
        echo "🚀 启动服务..."
        # 停止现有容器
        docker-compose down 2>/dev/null || true
        
        # 构建并启动
        docker-compose up -d --build
        
        echo "⏳ 等待服务启动..."
        sleep 10
        
        # 检查服务状态
        if docker-compose ps | grep -q "Up"; then
            echo "✅ 服务启动成功！"
            echo "🌐 访问地址: http://localhost:3003"
            echo "📊 健康检查: http://localhost:3003/api/health"
        else
            echo "❌ 服务启动失败，请查看日志"
            docker-compose logs
            exit 1
        fi
        ;;
    
    "stop")
        echo "🛑 停止服务..."
        docker-compose down
        echo "✅ 服务已停止"
        ;;
    
    "restart")
        echo "🔄 重启服务..."
        docker-compose restart
        echo "✅ 服务已重启"
        ;;
    
    "logs")
        echo "📝 查看日志..."
        docker-compose logs -f
        ;;
    
    "clean")
        echo "🧹 清理Docker资源..."
        docker-compose down -v
        docker rmi $DOCKER_IMAGE 2>/dev/null || true
        docker system prune -f
        echo "✅ 清理完成"
        ;;
    
    "status")
        echo "📊 服务状态..."
        docker-compose ps
        ;;
    
    *)
        echo "使用方法: $0 [build|start|stop|restart|logs|clean|status]"
        echo ""
        echo "命令说明:"
        echo "  build   - 构建Docker镜像"
        echo "  start   - 启动服务"
        echo "  stop    - 停止服务"
        echo "  restart - 重启服务"
        echo "  logs    - 查看日志"
        echo "  clean   - 清理Docker资源"
        echo "  status  - 查看服务状态"
        exit 1
        ;;
esac