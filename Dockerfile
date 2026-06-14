# =====================
# Stage 1: 构建前端
# =====================
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

# 先复制 package 文件，利用 Docker 缓存
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund

# 再复制源码并构建
COPY frontend/ ./
RUN npm run build

# =====================
# Stage 2: 构建后端运行镜像
# =====================
FROM node:20-alpine AS backend-deps
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --no-audit --no-fund

# =====================
# Stage 3: 最终运行镜像（轻量）
# =====================
FROM node:20-alpine
WORKDIR /app

# 系统依赖：SQLite 需要 libsqlite3，alpine 自带已满足
ENV NODE_ENV=production
ENV PORT=5000

# 复制后端源码和依赖
COPY backend/ ./backend/
COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules

# 把前端构建产物复制到 backend/../frontend/dist/
# server.js 用 path.join(__dirname, '..', 'frontend', 'dist') 来寻找
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# 工作目录设为 backend，让 server.js 的相对路径与本地一致
WORKDIR /app/backend

# 暴露端口
EXPOSE 5000

# 启动
CMD ["node", "server.js"]
