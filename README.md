# Easy Blog

一个用 React + Node.js + Express + SQLite 开发的博客系统。

## 🌐 在线访问

**公网地址：** http://47.97.16.173:5000

注册账号即可使用博客功能！

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

## 🚀 部署到阿里云 (推荐，国内访问快)

### 方式 A：在阿里云买一台 ECS 云服务器（最简单）

**前提条件**

1. 登录阿里云官网: https://www.aliyun.com
2. 购买一台 **ECS 云服务器**
   - 推荐配置: **1 核 2GB** 或 **2 核 4GB**
   - 系统: **Ubuntu 22.04 LTS** 或 **CentOS 7/8**
   - 价格: 新用户约 ¥99/年，学生更便宜
3. 购买时记得：
   - 勾选 **"分配公网 IP"**
   - **安全组**开放端口: **22 (SSH)**, **80 (HTTP)**, **443 (HTTPS)**, **5000**

**部署步骤（共 3 步）**

**步骤 1：用 SSH 连接你的服务器**

在你本地电脑上打开 PowerShell 或终端：
```bash
# 假设你的服务器公网 IP 是 123.45.67.89
ssh root@123.45.67.89
# 输入密码或用密钥登录
```

**步骤 2：上传代码到服务器**

在服务器上执行：
```bash
# 从 GitHub 下载你的代码（推荐）
git clone https://github.com/Hugo-Chen84/Easy_Blog.git
cd Easy_Blog

# 运行一键部署脚本
chmod +x deploy.sh
sudo bash deploy.sh
```

等待几分钟，部署完成后访问：
```
http://你的服务器公网IP:5000

# 例如: http://123.45.67.89:5000
```

**步骤 3：配置 Nginx（可选，但推荐）**

如果你想让用户直接访问 IP 而不是加端口 5000：
```bash
# 把项目里的 nginx.conf 复制到 Nginx 目录
sudo cp /root/Easy_Blog/nginx.conf /etc/nginx/conf.d/easy-blog.conf

# 重启 Nginx
sudo systemctl restart nginx
```

然后就能直接访问: `http://你的公网IP`

---

### 方式 B：使用阿里云容器服务（更专业）

如果你了解 Docker，可以用容器化部署：

```bash
# 构建镜像
docker build -t easy-blog:latest .

# 运行容器
docker run -d --name easy-blog \
  -p 5000:5000 \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  easy-blog:latest
```

---

## 🔄 以后修改代码如何同步到阿里云服务器？

**方法：在你的电脑上修改 → push 到 GitHub → 服务器上 pull 更新**

```bash
# 在你的本地电脑修改完代码后
git add .
git commit -m "更新了首页样式"
git push

# 然后 SSH 登录服务器
ssh root@你的服务器IP

# 在服务器上拉取最新代码并重启
cd Easy_Blog
git pull
npm install   # 如果有新依赖
pm2 restart easy-blog
```

就这么简单！

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
├── Dockerfile           # 容器镜像配置 (阿里云容器服务)
├── nginx.conf           # Nginx 反向代理配置
├── deploy.sh            # 阿里云 ECS 一键部署脚本
├── .dockerignore        # Docker 忽略文件
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
