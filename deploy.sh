#!/bin/bash

# Zeabur部署脚本
# 使用方法: ./deploy.sh

echo "🚀 开始准备Zeabur部署..."

# 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 发现未提交的更改，正在提交..."
    git add .
    echo "请输入提交信息 (默认: 准备Zeabur部署):"
    read -r commit_message
    if [ -z "$commit_message" ]; then
        commit_message="准备Zeabur部署"
    fi
    git commit -m "$commit_message"
else
    echo "✅ 代码已是最新状态"
fi

# 推送到远程仓库
echo "📤 推送代码到远程仓库..."
git push origin main || git push origin master

if [ $? -eq 0 ]; then
    echo "✅ 代码推送成功！"
    echo ""
    echo "🎯 接下来的步骤:"
    echo "1. 访问 https://zeabur.com 登录控制台"
    echo "2. 创建新项目并选择你的代码仓库"
    echo "3. 配置环境变量 (参考 .env.example)"
    echo "4. 等待自动部署完成"
    echo ""
    echo "📋 需要配置的环境变量:"
    echo "   NODE_ENV=production"
    echo "   PORT=3003"
    echo "   IFLYTEK_APPID=27d422bd"
    echo "   IFLYTEK_API_SECRET=NjRmZjM4NGUzZGFkNTUxZjM3NzQxYjJh"
    echo "   IFLYTEK_API_KEY=f362096d765f0452321a6f4c51a5d735"
    echo ""
    echo "🔗 部署完成后，你将获得一个类似这样的访问地址:"
    echo "   https://your-project-name.zeabur.app"
else
    echo "❌ 代码推送失败，请检查网络连接和仓库权限"
    exit 1
fi

echo "🎉 部署准备完成！"