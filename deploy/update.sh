#!/bin/bash
# 远程更新脚本 — Termius 连上后执行：bash deploy/update.sh
set -e

APP_DIR="/home/dalang"
cd $APP_DIR

echo "===== 拉取最新代码 ====="
git pull

echo "===== 更新后端 ====="
cd backend
npm install --production
npx prisma generate
npx prisma db push
npm run build
pm2 restart dalang-api

echo "===== 更新前端 ====="
cd ../frontend
npm install
npm run build

echo ""
echo "✅ 更新完成！"
pm2 status
