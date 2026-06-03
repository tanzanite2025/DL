# 服务器完全清理并重新部署（无数据版）

## 🎯 一键清理并重新部署

直接复制粘贴执行：

```bash
# ============================================
# 第一步：完全清理旧项目
# ============================================

# 停止所有 PM2 进程
pm2 stop all
pm2 delete all
pm2 save

# 停止 Nginx
systemctl stop nginx

# 删除旧项目目录
cd /home
rm -rf dalang

# 清理 Nginx 配置
rm -f /etc/nginx/sites-enabled/dalang
rm -f /etc/nginx/sites-available/dalang

echo "✅ 旧项目已清理完毕"

# ============================================
# 第二步：克隆最新代码
# ============================================

cd /home
git clone https://github.com/你的用户名/dalang.git
cd dalang

echo "✅ 最新代码已克隆"

# ============================================
# 第三步：部署后端
# ============================================

cd /home/dalang/backend

# 安装依赖
npm install

# 创建 .env 文件
cat > .env << 'EOF'
JWT_SECRET=$(openssl rand -hex 32)
CORS_ORIGIN=http://你的服务器IP
PORT=3001
DATABASE_URL="file:./prisma/dev.db"
EOF

# 初始化数据库
npx prisma generate
npx prisma db push

# 启动后端
pm2 start npm --name "dalang-backend" -- run dev

echo "✅ 后端部署完成"

# ============================================
# 第四步：部署前端
# ============================================

cd /home/dalang/frontend

# 安装依赖
npm install

# 构建生产版本
npm run build

echo "✅ 前端构建完成"

# ============================================
# 第五步：配置 Nginx
# ============================================

cat > /etc/nginx/sites-available/dalang << 'EOF'
server {
    listen 80;
    server_name _;

    # 前端静态文件
    location / {
        root /home/dalang/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # API 反向代理
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        root /home/dalang/frontend/dist;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 启用配置
ln -sf /etc/nginx/sites-available/dalang /etc/nginx/sites-enabled/

# 测试并重启 Nginx
nginx -t && systemctl start nginx

echo "✅ Nginx 配置完成"

# ============================================
# 第六步：设置开机自启
# ============================================

pm2 save
pm2 startup

echo "✅ 部署完成！"
echo ""
echo "📝 接下来："
echo "1. 执行上面 pm2 startup 输出的 sudo 命令"
echo "2. 访问 http://你的服务器IP"
echo "3. 使用 admin / 123456 登录"
echo ""
echo "🔍 查看状态："
echo "   pm2 status"
echo "   pm2 logs dalang-backend"
echo "   systemctl status nginx"
```

---

## 📝 使用步骤

### 1. 在本地提交最新代码

```bash
# Windows 本地
cd c:\Users\P16V\Desktop\Github\dalang
git add .
git commit -m "更新项目配置"
git push origin main
```

### 2. 登录服务器

```bash
ssh root@172.17.26.4
```

### 3. 执行部署脚本

把上面的完整脚本复制粘贴到服务器终端，**记得修改**：
- `git clone` 的仓库地址
- `CORS_ORIGIN` 的服务器 IP

### 4. 完成 PM2 自启动设置

脚本执行完后，会输出类似这样的命令：
```bash
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root
```

**复制并执行这个命令。**

---

## 🚀 快速命令（分步执行）

如果你想分步执行，可以用这些：

### 清理

```bash
pm2 stop all && pm2 delete all && pm2 save
systemctl stop nginx
cd /home && rm -rf dalang
rm -f /etc/nginx/sites-enabled/dalang
```

### 克隆

```bash
cd /home
git clone https://github.com/你的仓库/dalang.git
```

### 后端

```bash
cd /home/dalang/backend
npm install
cat > .env << 'EOF'
JWT_SECRET=dalang-super-secret-key-change-in-production-40-chars
CORS_ORIGIN=http://172.17.26.4
PORT=3001
EOF
npx prisma generate && npx prisma db push
pm2 start npm --name "dalang-backend" -- run dev
```

### 前端

```bash
cd /home/dalang/frontend
npm install
npm run build
```

### Nginx

```bash
cp /home/dalang/deploy/nginx.conf /etc/nginx/sites-available/dalang
ln -sf /etc/nginx/sites-available/dalang /etc/nginx/sites-enabled/
nginx -t && systemctl start nginx
```

---

## ✅ 验证部署

```bash
# 查看服务状态
pm2 status

# 查看后端日志
pm2 logs dalang-backend --lines 30

# 查看 Nginx 状态
systemctl status nginx

# 测试后端 API
curl http://localhost:3001/api/auth/login

# 测试前端
curl -I http://localhost
```

---

## 🔍 常见问题

### 1. Git 克隆失败

**私有仓库需要认证**：

```bash
# 方法一：使用 Personal Access Token
git clone https://你的token@github.com/用户名/dalang.git

# 方法二：配置 SSH
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub
# 将公钥添加到 GitHub Settings > SSH Keys
```

### 2. npm install 很慢

```bash
# 使用淘宝镜像
npm config set registry https://registry.npmmirror.com

# 或者使用 pnpm（更快）
npm install -g pnpm
pnpm install  # 代替 npm install
```

### 3. PM2 启动失败

```bash
# 查看详细错误
pm2 logs dalang-backend --err --lines 50

# 手动启动测试
cd /home/dalang/backend
npm run dev
```

### 4. Nginx 配置错误

```bash
# 查看错误详情
nginx -t

# 查看日志
tail -f /var/log/nginx/error.log
```

### 5. 前端白屏

```bash
# 检查 dist 目录
ls -la /home/dalang/frontend/dist/

# 重新构建
cd /home/dalang/frontend
rm -rf dist
npm run build

# 检查权限
chmod -R 755 /home/dalang/frontend/dist
```

---

## 🎯 预计执行时间

- **清理**: ~30 秒
- **克隆代码**: ~10 秒
- **后端部署**: ~2-3 分钟（npm install）
- **前端构建**: ~1-2 分钟
- **Nginx 配置**: ~10 秒

**总计**: 约 5 分钟

---

## 📱 访问系统

部署完成后：

**前端**: `http://你的服务器IP`  
**登录**: `admin` / `123456`

---

**更新时间**: 2026-06-03  
**适用场景**: 全新部署，无需保留数据
