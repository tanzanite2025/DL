# 服务器清理与重新部署指南

## 📋 当前状态分析

根据你的服务器信息：
- **系统**: Ubuntu 24.04.2 LTS
- **IP**: 172.17.26.4
- **登录**: root 用户
- **云平台**: 阿里云 ECS

## 🎯 清理和重新部署方案

---

## 方案一：完全清理重新部署（推荐）⭐

适用于：想要从头开始，确保环境干净

### 第 1 步：备份数据库（重要！）

```bash
# 登录服务器
ssh root@172.17.26.4

# 如果之前部署过，先备份数据库
cd /home/dalang/backend/prisma
cp dev.db ~/backup_dev_$(date +%Y%m%d_%H%M%S).db

# 或者整个项目备份
cd /home
tar -czf dalang_backup_$(date +%Y%m%d_%H%M%S).tar.gz dalang
mv dalang_backup_*.tar.gz ~/
```

### 第 2 步：停止所有服务

```bash
# 停止 PM2 进程
pm2 stop all
pm2 delete all
pm2 save

# 查看是否还有残留进程
pm2 list

# 停止 Nginx（如果配置过）
systemctl stop nginx
```

### 第 3 步：完全删除旧项目

```bash
# 删除旧项目目录
cd /home
rm -rf dalang

# 清理 Nginx 配置（如果有）
rm -f /etc/nginx/sites-enabled/dalang
rm -f /etc/nginx/sites-available/dalang

# 重新加载 Nginx
systemctl reload nginx
```

### 第 4 步：克隆最新代码

```bash
# 进入 home 目录
cd /home

# 克隆你的仓库（替换为你的实际仓库地址）
git clone https://github.com/你的用户名/dalang.git

# 如果是私有仓库，可能需要配置 SSH 密钥或使用 Personal Access Token
# git clone https://github.com/你的用户名/dalang.git
```

### 第 5 步：安装后端依赖

```bash
cd /home/dalang/backend

# 安装依赖
npm install

# 创建 .env 配置文件
cat > .env << 'EOF'
JWT_SECRET=你的超级安全密钥-至少40位-请修改
CORS_ORIGIN=http://你的服务器IP
PORT=3001
DATABASE_URL="file:./prisma/dev.db"
EOF

# 生成 Prisma Client
npx prisma generate

# 执行数据库迁移
npx prisma migrate deploy

# 或者如果需要重置数据库
npx prisma db push

# 可选：运行种子数据
npx prisma db seed
```

### 第 6 步：构建后端

```bash
# 如果项目有构建步骤
npm run build

# 或者直接启动开发模式
pm2 start npm --name "dalang-backend" -- run dev
```

### 第 7 步：安装和构建前端

```bash
cd /home/dalang/frontend

# 安装依赖
npm install

# 构建生产版本
npm run build

# 检查构建结果
ls -la dist/
```

### 第 8 步：配置 Nginx

```bash
# 创建 Nginx 配置
cat > /etc/nginx/sites-available/dalang << 'EOF'
server {
    listen 80;
    server_name 你的服务器IP或域名;

    # 前端静态文件
    location / {
        root /home/dalang/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # API 反向代理到后端
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /home/dalang/frontend/dist;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 启用配置
ln -sf /etc/nginx/sites-available/dalang /etc/nginx/sites-enabled/dalang

# 测试配置
nginx -t

# 重启 Nginx
systemctl restart nginx
```

### 第 9 步：设置 PM2 开机自启

```bash
# 保存当前 PM2 进程列表
pm2 save

# 设置开机自启
pm2 startup

# 执行上面命令输出的 sudo 命令
# 示例：sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root
```

### 第 10 步：验证部署

```bash
# 查看后端状态
pm2 status

# 查看后端日志
pm2 logs dalang-backend --lines 50

# 测试后端 API
curl http://localhost:3001/api/auth/login

# 查看 Nginx 状态
systemctl status nginx

# 测试前端访问
curl http://localhost
```

---

## 方案二：保留数据库更新代码（谨慎）

适用于：已有重要数据，只想更新代码

### 第 1 步：停止服务

```bash
pm2 stop dalang-backend
```

### 第 2 步：备份数据库

```bash
cd /home/dalang/backend/prisma
cp dev.db ~/backup_dev_$(date +%Y%m%d_%H%M%S).db
```

### 第 3 步：拉取最新代码

```bash
cd /home/dalang

# 保存本地修改（如果有）
git stash

# 拉取最新代码
git pull origin main

# 或者强制覆盖
git fetch origin
git reset --hard origin/main
```

### 第 4 步：更新依赖

```bash
# 更新后端
cd /home/dalang/backend
npm install
npx prisma generate
npx prisma migrate deploy

# 更新前端
cd /home/dalang/frontend
npm install
npm run build
```

### 第 5 步：重启服务

```bash
# 重启后端
pm2 restart dalang-backend

# 重启 Nginx
systemctl reload nginx
```

---

## 🔍 故障排查

### 问题 1：Git 克隆失败

```bash
# 如果是私有仓库，需要配置 SSH 密钥
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub
# 将公钥添加到 GitHub/GitLab 的 SSH Keys

# 或者使用 Personal Access Token
git clone https://你的token@github.com/用户名/dalang.git
```

### 问题 2：端口被占用

```bash
# 查看端口占用
netstat -tlnp | grep 3001

# 杀死占用进程
kill -9 <PID>
```

### 问题 3：权限问题

```bash
# 修复文件权限
chmod -R 755 /home/dalang/frontend/dist
chown -R www-data:www-data /home/dalang/frontend/dist

# 修复数据库权限
chmod 755 /home/dalang/backend/prisma/
chmod 644 /home/dalang/backend/prisma/dev.db
```

### 问题 4：Nginx 配置错误

```bash
# 查看错误日志
tail -f /var/log/nginx/error.log

# 测试配置
nginx -t

# 查看具体哪里错了
journalctl -u nginx -n 50
```

### 问题 5：PM2 进程异常

```bash
# 查看详细日志
pm2 logs dalang-backend --err --lines 100

# 重新启动
pm2 restart dalang-backend

# 如果还是不行，删除后重新创建
pm2 delete dalang-backend
cd /home/dalang/backend
pm2 start npm --name "dalang-backend" -- run dev
pm2 save
```

---

## 📝 环境变量配置清单

### 后端 `.env` 文件（/home/dalang/backend/.env）

```env
# JWT 密钥（生产环境必须修改为强随机字符串）
JWT_SECRET=生成一个至少40位的随机字符串

# CORS 允许的前端地址
CORS_ORIGIN=http://你的服务器IP

# 后端服务端口
PORT=3001

# 数据库文件路径
DATABASE_URL="file:./prisma/dev.db"
```

### 生成安全的 JWT_SECRET

```bash
# 方法 1：使用 openssl
openssl rand -hex 32

# 方法 2：使用 node
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## ✅ 部署后检查清单

- [ ] 后端服务正常运行（pm2 status）
- [ ] 后端端口正确（3001）
- [ ] 数据库文件存在且可读写
- [ ] Nginx 服务正常运行
- [ ] 前端静态文件已构建（dist 目录存在）
- [ ] 前端可通过浏览器访问
- [ ] API 代理正常工作（/api 请求到后端）
- [ ] 登录功能正常（admin / 123456）
- [ ] PM2 开机自启已配置
- [ ] 数据库已备份

---

## 🚀 快速命令合集

### 一键停止和清理

```bash
pm2 stop all && pm2 delete all && pm2 save
systemctl stop nginx
cd /home && rm -rf dalang
```

### 一键重新部署（假设代码已在服务器）

```bash
cd /home/dalang/backend
npm install && npx prisma generate && npx prisma migrate deploy
pm2 restart dalang-backend || pm2 start npm --name "dalang-backend" -- run dev

cd /home/dalang/frontend
npm install && npm run build
systemctl reload nginx
```

### 查看所有服务状态

```bash
echo "=== PM2 状态 ==="
pm2 status

echo -e "\n=== Nginx 状态 ==="
systemctl status nginx --no-pager

echo -e "\n=== 端口占用 ==="
netstat -tlnp | grep -E "(3001|80)"

echo -e "\n=== 最近日志 ==="
pm2 logs dalang-backend --lines 10 --nostream
```

---

## 💡 建议

1. **在部署前先提交代码到 Git**
   ```bash
   # 在本地（Windows）
   git add .
   git commit -m "更新端口配置为 5500/5501"
   git push origin main
   ```

2. **使用部署脚本自动化**
   - 可以使用项目中的 `deploy/deploy.sh`
   - 或者创建自定义部署脚本

3. **定期备份数据库**
   ```bash
   # 创建备份脚本
   cat > /root/backup_db.sh << 'EOF'
#!/bin/bash
cd /home/dalang/backend/prisma
cp dev.db ~/backups/dev_$(date +%Y%m%d_%H%M%S).db
# 只保留最近 7 天的备份
find ~/backups -name "dev_*.db" -mtime +7 -delete
EOF

   chmod +x /root/backup_db.sh
   
   # 添加到 crontab（每天凌晨 2 点备份）
   crontab -e
   # 添加：0 2 * * * /root/backup_db.sh
   ```

4. **监控服务健康**
   ```bash
   # 安装 PM2 监控
   pm2 install pm2-logrotate
   
   # 设置日志大小限制
   pm2 set pm2-logrotate:max_size 10M
   pm2 set pm2-logrotate:retain 7
   ```

---

## 🔗 相关文档

- 原部署文档：`DEPLOY.md`
- 部署检查清单：`DEPLOYMENT_CHECKLIST.md`
- 登录信息：`LOGIN_INFO.md`

---

**最后更新**: 2026-06-03  
**适用版本**: 达朗 ERP v1.0  
**服务器环境**: Ubuntu 24.04 + Node.js 20 + Nginx + PM2
