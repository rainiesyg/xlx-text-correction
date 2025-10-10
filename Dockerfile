# 使用官方Node.js LTS版本
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package文件并安装依赖
COPY package*.json ./
RUN npm install --production --silent

# 复制应用代码
COPY server.js ./
COPY middleware/ ./middleware/
COPY routes/ ./routes/
COPY public/ ./public/

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]