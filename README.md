# 个人博客项目

一个使用 React + Node.js + Express + SQLite 构建的个人博客系统。

## 功能特性

- ✅ 用户注册和登录
- ✅ 博客创建、展示、搜索
- ✅ 点赞和取消点赞
- ✅ 博客评论

## 技术栈

### 前端
- React 18 - UI 框架
- Vite - 构建工具
- React Router - 路由管理
- Axios - HTTP 请求
- CSS - 样式

### 后端
- Node.js - 运行时
- Express - Web 框架
- Sequelize - ORM
- SQLite - 数据库
- bcryptjs - 密码加密
- jsonwebtoken - JWT 认证

## 项目结构

```
my_blog/
├── frontend/                # 前端项目
│   ├── src/
│   │   ├── components/      # 公共组件
│   │   ├── pages/           # 页面组件
│   │   ├── App.jsx          # 主组件
│   │   ├── main.jsx         # 入口文件
│   │   └── index.css        # 全局样式
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── backend/                 # 后端项目
│   ├── src/
│   │   ├── models/          # 数据模型
│   │   └── routes/          # API 路由
│   ├── server.js            # 服务器入口
│   └── package.json
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ../backend
npm install
```

### 2. 启动项目

```bash
# 启动后端（在 backend 目录）
npm run dev

# 启动前端（在 frontend 目录，新开一个终端）
npm run dev
```

### 3. 访问应用

- 前端: http://localhost:3000
- 后端 API: http://localhost:5000

## API 接口

### 认证相关
- POST /api/auth/register - 用户注册
- POST /api/auth/login - 用户登录

### 博客相关
- GET /api/blogs - 获取所有博客
- GET /api/blogs/search?keyword=xxx - 搜索博客
- GET /api/blogs/:id - 获取单篇博客
- POST /api/blogs - 创建博客（需登录）
- POST /api/blogs/:id/like - 点赞（需登录）
- DELETE /api/blogs/:id/like - 取消点赞（需登录）
- POST /api/blogs/:id/comments - 添加评论（需登录）

## 数据库模型

### User（用户）
- id: 主键
- username: 用户名（唯一）
- password: 密码（加密存储）

### Blog（博客）
- id: 主键
- title: 标题
- content: 内容
- authorId: 作者 ID

### Comment（评论）
- id: 主键
- content: 内容
- blogId: 博客 ID
- userId: 用户 ID

### Like（点赞）
- id: 主键
- blogId: 博客 ID
- userId: 用户 ID
