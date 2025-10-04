# 使用官方Node.js运行时作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装生产依赖
RUN npm ci --only=production

# 复制应用代码
COPY simple-server.js .

# 暴露端口（Zeabur会动态分配，但保留3000作为默认）
EXPOSE 3000

# 启动应用
CMD ["node", "simple-server.js"]