# Easy Blog

> 一个由 CS 小白从零搭建的简易博客系统，记录技术成长的点滴。

## 🌐 在线访问

**公网地址：** http://47.97.16.173:5000

---

## ✨ 已实现功能

| 模块 | 功能 |
|------|------|
| 👤 用户 | 用户注册 / 登录 / JWT 鉴权 / 用户名不重复校验 |
| 🖼️ 头像 | 默认头像 + 自定义头像上传（multer）+ 加载失败自动回退 |
| ✍️ 博客 | 发布博客 / Markdown 编辑器 / 博客详情浏览 |
| 🔍 搜索 | 全文搜索（按作者名 / 标题 / 内容，按权重排序 + 分页） |
| 📌 置顶 | 欢迎帖自动置顶显示 |
| ❤️ 互动 | 点赞 / 取消点赞 / 评论 |
| 👁️ 浏览量 | 每篇博客独立访问计数 |
| 📱 响应式 | PC + 移动端适配（768px / 480px 两个断点） |
| 🐙 GitHub | 右上角跳转源码仓库 + GitHub OAuth Device Flow 登录 |

---

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 18 + React Router + Axios + React Markdown（支持 GFM） |
| **构建** | Vite 6 |
| **后端** | Node.js + Express 4 |
| **数据库** | SQLite + Sequelize ORM |
| **鉴权** | jsonwebtoken (JWT) + bcryptjs（密码加密） |
| **文件上传** | multer |
| **部署** | pm2 进程守护 + 一键部署脚本 |
| **样式** | 原生 CSS（科技感渐变 / 发光动效） |

---

## 💻 本地开发部署

### 前置条件
- Node.js **18** 或更高版本
- Git（可选，用来 clone 代码）

### 步骤 1：获取代码

```bash
git clone https://github.com/Hugo-Chen84/Easy_Blog.git
cd Easy_Blog
```

### 步骤 2：安装依赖

```bash
# 进入后端目录安装
cd backend
npm install

# 进入前端目录安装
cd ../frontend
npm install
```

### 步骤 3：构建前端

```bash
# 在 frontend 目录下
npm run build
```

构建产物会生成到 `frontend/dist`，由后端 Express 作为静态资源托管。

### 步骤 4：启动后端服务器

```bash
# 回到项目根目录，然后进入 backend
cd backend
node server.js
```

### 步骤 5：访问

- 博客首页：http://localhost:5000
- 后端 API 端口：**5000**

首次启动时，系统会自动创建 SQLite 数据库表（`backend/database.sqlite`）。

---

## 🌤️ 启用 GitHub 登录（可选）

在 `backend` 目录下创建 `.env` 文件：

```env
GITHUB_CLIENT_ID=你的GitHubClientID
GITHUB_CLIENT_SECRET=你的GitHubClientSecret
SESSION_SECRET=随便写一串复杂字符串
```

在 GitHub 上创建 OAuth App 并获取 Client ID 与 Secret，然后重启服务：

```bash
pm2 restart easy-blog
```

---

## 📁 项目结构

```
Easy_Blog/
├── frontend/            # React 前端
│   ├── src/
│   │   ├── components/  # 公共组件（导航栏 Navbar）
│   │   └── pages/       # 页面（Home / Login / Register / BlogDetail / CreateBlog）
│   ├── public/          # 静态资源（背景图片）
│   └── package.json
├── backend/             # Node.js 后端
│   ├── src/
│   │   ├── models/      # 数据库模型（User / Blog / Comment / Like）
│   │   └── routes/      # API 路由（auth / blog）
│   ├── uploads/         # 用户上传的头像文件（自动创建，不上传 git）
│   └── server.js        # 服务器入口
├── package.json         # 根目录配置
├── nginx.conf           # Nginx 反向代理配置
├── deploy.sh            # 阿里云 ECS 一键部署脚本
└── README.md
```

---

## 🔌 API 接口速查

所有接口以 `/api` 开头，需鉴权的接口须在请求头中携带：`Authorization: Bearer <token>`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录（返回 JWT） |
| GET  | `/api/auth/me` | 获取当前用户信息 |
| POST | `/api/auth/upload-avatar` | 上传头像（需登录） |
| GET  | `/api/auth/github-config` | GitHub 登录是否启用 |
| POST | `/api/auth/github-login` | GitHub Device Flow 登录 |
| GET  | `/api/blogs` | 获取博客列表（支持分页 page + pageSize） |
| GET  | `/api/blogs/search?keyword=xxx` | 搜索博客（按作者 / 标题 / 内容） |
| GET  | `/api/blogs/:id` | 获取博客详情 + 评论（访问次数 +1） |
| POST | `/api/blogs` | 发布新博客（需登录） |
| POST | `/api/blogs/:id/like` | 点赞博客 |
| DELETE | `/api/blogs/:id/like` | 取消点赞 |
| POST | `/api/blogs/:id/comments` | 添加评论 |
| GET  | `/api/health` | 健康检查 |

---

## 🔄 更新代码后如何同步服务器

```bash
# 本地修改完成后
git add .
git commit -m "更新了xxx功能"
git push

# SSH 登录服务器
ssh root@47.97.16.173
cd Easy_Blog

# 方式 A（推荐）：一键部署脚本
chmod +x deploy.sh
./deploy.sh

# 方式 B：手动更新
git pull
cd backend && npm install
cd ../frontend && npm install && npm run build
pm2 restart easy-blog
```

---

## 📝 License

MIT © 2026 Easy Blog
