FROM node:18-alpine

WORKDIR /app

# 复制 package.json 并安装依赖
COPY package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# 安装依赖并构建前端
RUN npm install

# 复制所有源码
COPY . .

# 暴露端口
EXPOSE 5000

# 启动命令
CMD ["npm", "start"]
