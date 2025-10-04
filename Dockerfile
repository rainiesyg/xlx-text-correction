FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY simple-server.js ./

EXPOSE 3000

CMD ["node", "simple-server.js"]