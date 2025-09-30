# 使用官方Node.js运行时作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 复制测试服务器文件
COPY test-server.js ./

# 设置权限
RUN chown -R node:node /app

# 切换到非root用户
USER node

# 暴露端口（Zeabur会自动设置PORT环境变量）
EXPOSE 3000

# 健康检查（使用动态端口）
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const port = process.env.PORT || 3000; require('http').get(\`http://localhost:\${port}/health\`, (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 启动测试服务器
CMD ["node", "test-server.js"]