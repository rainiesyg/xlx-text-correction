# 使用官方Node.js运行时作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install --production

# 复制测试服务器文件
COPY test-server.js ./

# 暴露端口（Zeabur会动态分配端口）
EXPOSE 3000

# 启动测试服务器
CMD ["node", "test-server.js"]