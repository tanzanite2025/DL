#!/bin/bash
# 大浪 ERP 阿里云 Ubuntu 部署脚本
# 用法：bash deploy.sh

set -e

APP_DIR="/home/dalang"
LOG_DIR="/home/dalang/logs"

echo "===== 1. 安装基础依赖 ====="
sudo apt update
sudo apt install -y nginx git curl

echo "===== 2. 安装 Node.js 20 ====="
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi
echo "Node: $(node -v)  npm: $(npm -v)"

echo "===== 3. 安装 PM2 ====="
if ! command -v pm2 &> /dev/null; then
  sudo npm install -g pm2
fi

echo "===== 4. 创建目录 ====="
mkdir -p $LOG_DIR

echo "===== 5. 安装后端依赖 ====="
cd $APP_DIR/backend
npm install
npx prisma generate
npx prisma db push

echo "===== 6. 配置环境变量 ====="
if [ ! -f .env ]; then
  cp .env.production .env
  echo "⚠️  请编辑 $APP_DIR/backend/.env 设置 JWT_SECRET 和 CORS_ORIGIN"
  echo "   编辑后重新运行此脚本，或手动启动后端"
fi

echo "===== 7. 构建后端 ====="
npm run build

echo "===== 8. 安装前端依赖并构建 ====="
cd $APP_DIR/frontend
npm install
npm run build

echo "===== 9. 配置 Nginx ====="
sudo cp $APP_DIR/deploy/nginx.conf /etc/nginx/sites-available/dalang
sudo ln -sf /etc/nginx/sites-available/dalang /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo "===== 10. 启动后端 (PM2) ====="
cd $APP_DIR
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup

echo ""
echo "✅ 部署完成！"
echo "   前端：http://你的服务器IP"
echo "   后端 API：http://你的服务器IP/api"
echo ""
echo "⚠️  如果还没改 .env，请执行："
echo "   nano $APP_DIR/backend/.env"
echo "   pm2 restart dalang-api"
