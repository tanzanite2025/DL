# 大浪 ERP 部署指南（阿里云 Ubuntu）

## 服务器要求

- 阿里云 ECS，Ubuntu 20.04+
- 1C2G 即可（几人使用）
- 安全组开放 **80** 端口（HTTP）
- 3001 端口**不要**对外，仅 Nginx 本地代理

---

## 一、首次部署

### 1. 登录服务器，安装基础环境

```bash
sudo apt update && sudo apt install -y nginx git curl
```

### 2. 安装 Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

验证：
```bash
node -v   # v20.x
npm -v    # 10.x
pm2 -v    # 5.x
```

### 3. 拉取代码

```bash
cd /home
git clone <你的仓库地址> dalang
cd dalang
```

### 4. 配置环境变量

```bash
cp backend/.env.production backend/.env
nano backend/.env
```

修改为实际值：
```env
JWT_SECRET=换成40位以上随机字符串
CORS_ORIGIN=http://你的服务器公网IP
PORT=3001
```

生成随机密钥：
```bash
openssl rand -hex 32
```

### 5. 一键部署

```bash
bash deploy/deploy.sh
```

脚本会自动完成：安装依赖 → 数据库初始化 → 构建前后端 → 配置 Nginx → PM2 启动后端

### 6. 验证

浏览器访问 `http://你的IP`，用 `admin / 123456` 登录。

---

## 二、日常更新

```bash
cd /home/dalang
git pull

# 后端更新
cd backend
npm install          # 如有新依赖
npx prisma generate  # 如有 schema 变更
npx prisma db push   # 如有 schema 变更
npm run build
pm2 restart dalang-api

# 前端更新
cd ../frontend
npm install          # 如有新依赖
npm run build        # build 后 Nginx 自动读取，无需重启
```

---

## 三、常用运维命令

```bash
# 查看后端状态
pm2 status

# 查看实时日志
pm2 logs dalang-api

# 重启后端
pm2 restart dalang-api

# 重启 Nginx
sudo systemctl restart nginx

# 查看数据库（Prisma Studio，临时用）
cd /home/dalang/backend && npx prisma studio

# 备份 SQLite 数据库
cp /home/dalang/backend/prisma/dev.db /home/dalang/backup/dev_$(date +%Y%m%d).db
```

---

## 四、文件说明

```
dalang/
├── deploy/
│   ├── nginx.conf          # Nginx 配置（已自动复制到 sites-enabled）
│   ├── ecosystem.config.js # PM2 进程配置
│   └── deploy.sh           # 一键部署脚本
├── backend/
│   ├── .env.production     # 环境变量模板
│   ├── .env                # 实际环境变量（不提交 Git）
│   └── prisma/
│       └── dev.db          # SQLite 数据库文件
└── frontend/
    └── dist/               # 前端构建产物（Nginx 读取此目录）
```

---

## 五、Nginx 配置说明

`deploy/nginx.conf` 核心逻辑：

| 路径 | 处理方式 |
|------|----------|
| `/api/*` | 反向代理 → `127.0.0.1:3001`（后端） |
| `/assets/*` | 静态文件，缓存 30 天 |
| 其他 | `try_files` → `index.html`（SPA 路由） |

如需 HTTPS，用 Let's Encrypt：
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名
```

---

## 六、常见问题

### 前端白屏
- 检查 `frontend/dist/` 是否存在：`ls /home/dalang/frontend/dist/`
- 重新构建：`cd /home/dalang/frontend && npm run build`

### API 502 Bad Gateway
- 后端未启动：`pm2 restart dalang-api`
- 查看错误：`pm2 logs dalang-api --err`

### 数据库迁移后报错
```bash
cd /home/dalang/backend
npx prisma generate
npx prisma db push
pm2 restart dalang-api
```

### 权限问题
- Nginx 需要读取 `frontend/dist/`：`chmod -R 755 /home/dalang/frontend/dist`
- PM2 需要写入 `prisma/dev.db`：`chmod 755 /home/dalang/backend/prisma/`

### 端口被占用
```bash
sudo lsof -i :3001
kill <PID>
pm2 restart dalang-api
```

---

## 七、开机自启

`deploy.sh` 已自动配置，如需手动：

```bash
pm2 startup    # 生成开机启动命令，按提示执行输出的 sudo 命令
pm2 save       # 保存当前进程列表
```

---

## 八、卸载/清理

```bash
pm2 delete dalang-api
pm2 save
sudo rm /etc/nginx/sites-enabled/dalang
sudo systemctl reload nginx
# 删除代码
rm -rf /home/dalang
```
