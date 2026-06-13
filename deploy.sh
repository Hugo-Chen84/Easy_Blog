#!/bin/bash
# ==============================================================================
# Easy Blog —— 标准化一键部署脚本
# 使用方式（在服务器项目根目录执行）：
#   chmod +x deploy.sh
#   ./deploy.sh
#
# 如需启用 GitHub 登录，请在服务器环境变量中设置：
#   export GITHUB_CLIENT_ID=你的_GitHub_OAuth_App_Client_ID
# 或者写入 systemd/pm2 环境配置。
# ==============================================================================

set -e  # 任何命令失败时立即退出

# ---- 1. 备份数据库（简单防呆）----
if [ -f "backend/database.sqlite" ]; then
  BACKUP_FILE="backend/database.sqlite.bak.$(date +%Y%m%d-%H%M%S)"
  echo "[1/6] 备份数据库到 ${BACKUP_FILE}"
  cp backend/database.sqlite "${BACKUP_FILE}"
  # 仅保留最近 5 份备份
  ls -1t backend/database.sqlite.bak.* 2>/dev/null | tail -n +6 | xargs -r rm -f
else
  echo "[1/6] 未检测到现有数据库，跳过备份"
fi

# ---- 2. 拉取最新代码 ----
echo "[2/6] 拉取 GitHub 最新代码..."
git pull origin master || git pull origin main || git pull

# ---- 3. 安装后端依赖（仅当 package.json 变更时才会慢）----
echo "[3/6] 安装后端依赖..."
cd backend
npm install --production
cd ..

# ---- 4. 构建前端 ----
echo "[4/6] 安装前端依赖并构建生产版本..."
cd frontend
npm install
npm run build
cd ..

# ---- 5. 重启服务 ----
echo "[5/6] 停止并重启 pm2 服务..."
# 先尝试停止/删除旧的服务（忽略不存在错误），然后启动
pm2 stop easy-blog 2>/dev/null || true
pm2 delete easy-blog 2>/dev/null || true

# pm2 会继承当前 shell 的环境变量，因此在脚本外 export GITHUB_CLIENT_ID 即可生效
if [ -n "$GITHUB_CLIENT_ID" ]; then
  echo "    检测到 GITHUB_CLIENT_ID（${GITHUB_CLIENT_ID:0:8}...），已启用 GitHub 登录"
else
  echo "    未设置 GITHUB_CLIENT_ID（仍可用账号密码登录）"
fi
pm2 start backend/server.js --name easy-blog

# ---- 6. 保存 pm2 配置以便系统重启后自动恢复 ----
echo "[6/6] 保存 pm2 配置..."
pm2 save

echo ""
echo "✅ 部署完成！服务已重启"
echo "  请在浏览器访问：http://$(curl -s ifconfig.me 2>/dev/null || echo '<你的服务器IP>'):5000"
echo ""
echo "如需启用 GitHub 登录，请设置环境变量后重新部署："
echo "  export GITHUB_CLIENT_ID=你的ClientID"
echo "  ./deploy.sh"
echo ""
