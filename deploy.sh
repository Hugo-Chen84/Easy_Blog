#!/bin/bash

# Easy Blog 一键部署脚本 (适用于 Ubuntu/Debian)
# 使用方法: sudo bash deploy.sh

set -e

echo "============================================"
echo "  Easy Blog - 阿里云部署脚本"
echo "============================================"

# 1. 更新系统
echo "[1/6] 更新系统..."
apt-get update -y

# 2. 安装 Node.js 18
echo "[2/6] 安装 Node.js 18..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
else
    echo "Node.js 已安装，跳过"
fi

echo "Node.js 版本: $(node -v)"
echo "npm 版本: $(npm -v)"

# 3. 安装 Nginx (可选)
echo "[3/6] 安装 Nginx..."
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
    systemctl enable nginx
else
    echo "Nginx 已安装，跳过"
fi

# 4. 安装 PM2 (进程管理)
echo "[4/6] 安装 PM2..."
npm install -g pm2
pm2 startup systemd -u root --hp /root || true

# 5. 安装项目依赖并构建
echo "[5/6] 安装项目依赖..."
cd "$(dirname "$0")"
npm install

# 6. 启动服务
echo "[6/6] 启动服务..."

# 先停止旧的进程
pm2 delete easy-blog 2>/dev/null || true

# 启动 Node.js 服务
pm2 start npm --name "easy-blog" -- start
pm2 save

echo "============================================"
echo "  部署完成！"
echo "============================================"
echo ""
echo "服务状态: pm2 status"
echo "查看日志: pm2 logs easy-blog"
echo "重启服务: pm2 restart easy-blog"
echo ""
echo "访问地址: http://$(curl -s ifconfig.me):5000"
echo "（如果你配置了 Nginx，请直接访问服务器 IP）"
echo ""
