# Easy Blog

一个用 React + Node.js + Express + SQLite 开发的博客系统。

## ✨ 功能

- 用户注册/登录
- 发表博客文章
- 搜索博客
- 点赞/取消点赞
- 评论功能
- 科技感页面设计 + 动画背景

## 🛠 技术栈

| 前端 | 后端 |
|------|------|
| React 18 | Node.js + Express |
| React Router | Sequelize (SQLite) |
| Axios | bcryptjs (密码加密) |
| Vite | jsonwebtoken (JWT) |

## 💻 本地开发

### 前置条件
- Node.js 18 或更高版本

### 安装依赖

```bash
# 方式 1: 用根目录脚本
npm install

# 方式 2: 分别安装
cd backend && npm install
cd ../frontend && npm install
```

### 启动开发服务器

```bash
# 启动后端 (新终端窗口)
cd backend
npm install   # 如果还没安装
node server.js

# 启动前端 (另一个终端窗口)
cd frontend
npm install   # 如果还没安装
npm run dev
```

然后访问: http://localhost:3000

后端 API 运行在: http://localhost:5000

## 🚀 部署到 Render.com (推荐，完全免费)

### 步骤 1: 准备工作

1. 确保代码已推送到 GitHub 仓库: https://github.com/Hugo-Chen84/Easy_Blog
2. 注册一个 Render 账号: https://render.com （用 GitHub 登录）

### 步骤 2: 在 Render 创建 Web Service

1. 登录 Render 后，点击 **"New +"** → **"Web Service"**
2. 选择你刚才推送的 GitHub 仓库 **Easy_Blog**
3. 按下面填写配置:

| 配置项 | 填写内容 |
|--------|---------|
| **Name** | `easy-blog` 或你喜欢的名字 |
| **Region** | 选一个离你近的，例如 `Singapore` |
| **Branch** | `master` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | `Free` （免费） |

4. 点击 **"Deploy"** 按钮，等待部署完成（大约 2-5 分钟）

5. 部署成功后，你会得到一个网址，例如: `https://easy-blog-xxx.onrender.com`

打开这个网址就能访问你的博客了！🎉

### 步骤 3: 以后修改代码如何同步？

**非常简单！每次修改后只需 3 步:**

```bash
# 1. 保存修改后的代码
# 2. 提交到 git
git add .
git commit -m "更新了首页样式"

# 3. 推送到 GitHub
git push
```

**Render 会自动检测到 GitHub 的更新，重新编译部署！** （1-2 分钟后你的网站就更新了）

---

## 📁 项目结构

```
Easy_Blog/
├── frontend/            # React 前端
│   ├── src/
│   │   ├── components/  # 公共组件 (导航栏)
│   │   └── pages/       # 页面 (首页/登录/注册/详情/发布)
│   └── package.json
├── backend/             # Node.js 后端
│   ├── src/
│   │   ├── models/      # 数据库模型 (User/Blog/Comment/Like)
│   │   └── routes/      # API 路由 (auth/blog)
│   └── server.js        # 服务器入口
├── pictures/            # 背景图片
├── package.json         # 根目录部署脚本
├── render.yaml          # Render 部署配置
└── README.md
```

## 🔌 API 接口说明

所有接口以 `/api` 开头，前后端同源部署后自动工作。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| GET | `/api/blogs` | 获取所有博客 |
| GET | `/api/blogs/search?keyword=xxx` | 搜索博客 |
| GET | `/api/blogs/:id` | 获取博客详情 |
| POST | `/api/blogs` | 发布新博客 (需登录) |
| POST | `/api/blogs/:id/like` | 点赞博客 |
| DELETE | `/api/blogs/:id/like` | 取消点赞 |
| POST | `/api/blogs/:id/comments` | 添加评论 |
