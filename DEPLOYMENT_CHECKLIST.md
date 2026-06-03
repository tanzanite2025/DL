# 采购模块部署检查清单

## 📋 部署前检查

### 代码文件完整性
- [x] `backend/prisma/schema.prisma` - 数据库架构已更新
- [x] `backend/src/server.ts` - API 路由已添加，种子数据已更新
- [x] `frontend/src/pages/ProcurementManagement.tsx` - 新组件已创建
- [x] `frontend/src/App.tsx` - 路由和权限配置已更新
- [x] `frontend/src/pages/UsersPermissions.tsx` - 权限矩阵已更新
- [x] `frontend/src/i18n/translations.ts` - 翻译键已添加

### 代码修改确认
- [x] Role 模型添加了 `canAccessPurchase` 字段
- [x] 创建了 Supplier 模型
- [x] 创建了 PurchaseOrder 模型
- [x] Item 模型添加了 purchaseOrders 关系
- [x] 所有 API 端点已实现（suppliers, purchase-orders, receive）
- [x] 种子数据包含 `canAccessPurchase: true` for admin
- [x] App.tsx 的两处 userPermission 类型定义都包含 canAccessPurchase
- [x] 菜单项包含采购管理（ShoppingCart 图标）
- [x] 路由配置包含 /procurement
- [x] 权限矩阵表格包含"采购管理"列
- [x] handleTogglePermission 支持 canAccessPurchase

---

## 🚀 部署步骤

### 第 1 步：数据库迁移

```bash
cd backend
npx prisma migrate dev --name add_procurement_module
```

**预期输出**:
```
✔ Migration add_procurement_module created successfully
✔ Migration add_procurement_module applied successfully
```

**验证**:
```bash
npx prisma studio
```
打开 Prisma Studio，检查：
- [ ] Role 表有 canAccessPurchase 字段
- [ ] Supplier 表已创建
- [ ] PurchaseOrder 表已创建

### 第 2 步：生成 Prisma Client

```bash
npx prisma generate
```

**预期输出**:
```
✔ Generated Prisma Client
```

### 第 3 步：启动后端服务

```bash
npm run dev
```

**预期输出**:
```
Server is running on http://localhost:5501
种子数据初始化成功！（如果数据库为空）
```

**验证**:
- [ ] 服务器成功启动在 5501 端口
- [ ] 没有报错信息
- [ ] 控制台显示种子数据初始化（首次运行）

### 第 4 步：启动前端服务（新终端）

```bash
cd frontend
npm run dev
```

**预期输出**:
```
VITE ready in XXX ms
Local: http://localhost:5500/
```

**验证**:
- [ ] 前端成功启动在 5500 端口
- [ ] 没有编译错误
- [ ] 浏览器自动打开或手动访问 http://localhost:5500

---

## ✅ 功能测试清单

### 测试 1：权限管理
- [ ] 使用 admin / 123456 登录
- [ ] 点击侧边栏"权限管理"菜单
- [ ] 确认权限矩阵表格中有"采购管理"列
- [ ] 确认"系统管理员"角色的"采购管理"权限已勾选
- [ ] 创建一个测试角色，勾选"采购管理"权限
- [ ] 取消勾选，确认保存成功

### 测试 2：菜单和路由
- [ ] 确认左侧导航栏有"采购管理"菜单项（ShoppingCart 图标）
- [ ] 点击"采购管理"，成功跳转到采购管理页面
- [ ] 确认页面标题为"采购管理与供应商控制"（中文）或"Procurement & Supplier Control"（英文）
- [ ] 确认有两个 TAB："供应商管理"和"采购订单"

### 测试 3：供应商管理
- [ ] 切换到"供应商管理" TAB
- [ ] 点击"登记供应商"按钮
- [ ] 填写供应商信息：
  - 名称：测试供应商A
  - 联系人：张三
  - 电话：13800138000
  - 邮箱：test@supplier.com
  - 地址：北京市朝阳区
- [ ] 点击保存
- [ ] 确认供应商列表显示新供应商，编码为 SUPP-001
- [ ] 再创建一个供应商，确认编码自动递增为 SUPP-002
- [ ] 点击编辑按钮，修改供应商信息，确认保存成功
- [ ] 点击删除按钮（选择没有订单的供应商），确认删除成功

### 测试 4：采购订单管理
- [ ] 切换到"采购订单" TAB
- [ ] 点击"创建采购订单"按钮
- [ ] 选择供应商：SUPP-001
- [ ] 选择物料：高强度碳钢板（或其他已有物料）
- [ ] 输入采购数量：100
- [ ] 输入采购单价：500
- [ ] 确认订单总价自动计算为：50000
- [ ] 选择期望到货日期（可选）
- [ ] 点击保存
- [ ] 确认订单列表显示新订单，订单号为 PO-001，状态为"草稿"
- [ ] 再创建一个订单，确认订单号自动递增为 PO-002
- [ ] 点击编辑按钮，修改订单信息，确认保存成功

### 测试 5：收货登记
- [ ] 在订单列表中找到状态为"草稿"或"已确认"的订单
- [ ] 点击"收货登记"按钮
- [ ] 确认收货模态框弹出，显示订单信息
- [ ] 选择目标仓库：A号核心仓（或其他已有仓库）
- [ ] 输入本次收货数量：50（部分收货）
- [ ] 点击"确认收货入库"
- [ ] 确认 Toast 提示"收货登记成功，已自动入库"
- [ ] 确认订单列表中该订单的"已收货数量"更新为 50
- [ ] 再次点击"收货登记"，输入剩余数量：50
- [ ] 确认收货后，订单状态自动变为"已收货"
- [ ] 进入"货物流转"页面
- [ ] 确认有两条入库记录，类型为"入库"，备注包含采购订单号

### 测试 6：数据验证
- [ ] 尝试创建重名供应商，确认报错提示
- [ ] 尝试收货数量大于订单数量，确认报错提示
- [ ] 尝试删除有订单的供应商，确认报错提示
- [ ] 尝试提交空表单，确认必填项验证生效

### 测试 7：中英文切换
- [ ] 点击右上角语言切换按钮（中→英）
- [ ] 确认所有文本切换为英文：
  - 侧边栏："采购管理" → "Procurement"
  - 页面标题："采购管理与供应商控制" → "Procurement & Supplier Control"
  - TAB 标签："供应商管理" → "Suppliers"
  - 按钮文本："登记供应商" → "Register Supplier"
  - 订单状态："草稿" → "Draft"
- [ ] 再次切换回中文，确认所有文本恢复
- [ ] 确认没有任何混合文本（例如："操作员账号 (OPERATOR CODE)"）

### 测试 8：权限控制
- [ ] 进入"权限管理"页面
- [ ] 创建测试角色"采购专员"
- [ ] 只勾选"采购管理"权限，其他权限不勾选
- [ ] 创建测试用户 testuser / 123456，分配"采购专员"角色
- [ ] 退出登录
- [ ] 使用 testuser / 123456 登录
- [ ] 确认侧边栏只显示"采购管理"菜单，其他菜单不显示
- [ ] 尝试通过 URL 访问 /permissions，确认被拦截
- [ ] 确认可以正常使用采购管理功能
- [ ] 退出登录，重新使用 admin 登录

### 测试 9：业务流程完整性
- [ ] 创建供应商 → 创建采购订单 → 收货登记 → 查看货物流转
- [ ] 确认整个流程顺畅，数据一致
- [ ] 进入"仓库管理"页面，查看库存报表
- [ ] 确认收货后库存数量正确更新

### 测试 10：错误处理
- [ ] 关闭后端服务
- [ ] 在前端尝试操作，确认显示友好的错误提示
- [ ] 重启后端服务，确认功能恢复正常

---

## 🐛 常见问题排查

### 问题 1：迁移失败
**症状**: `npx prisma migrate dev` 报错

**解决方案**:
```bash
# 方案 A：重置数据库（警告：会清空数据）
npx prisma migrate reset
npx prisma migrate dev --name add_procurement_module

# 方案 B：删除迁移文件重新生成
# 1. 删除 backend/prisma/migrations 目录
# 2. 重新运行迁移
npx prisma migrate dev --name add_procurement_module
```

### 问题 2：前端编译错误
**症状**: 前端启动时报 TypeScript 错误

**解决方案**:
```bash
# 清理缓存重新安装依赖
cd frontend
rm -rf node_modules
rm package-lock.json
npm install
npm run dev
```

### 问题 3：看不到采购管理菜单
**症状**: 登录后侧边栏没有"采购管理"菜单

**排查步骤**:
1. 打开浏览器开发者工具（F12）
2. 查看 Network 标签，找到 `/api/auth/me` 请求
3. 检查响应中 `role.canAccessPurchase` 是否为 `true`
4. 如果为 `false`，进入"权限管理"页面手动勾选
5. 如果接口报错，检查后端日志

### 问题 4：收货不生成入库记录
**症状**: 收货成功但货物流转页面没有记录

**排查步骤**:
1. 打开浏览器开发者工具，查看收货请求的响应
2. 检查后端日志是否有错误
3. 使用 Prisma Studio 检查 GoodsMove 表是否有新记录
4. 确认 toWarehouseId 字段不为空

### 问题 5：翻译键显示异常
**症状**: 界面显示 `procurementMenu` 而不是"采购管理"

**解决方案**:
1. 检查 `frontend/src/i18n/translations.ts` 文件
2. 确认对应语言对象中有该翻译键
3. 清除浏览器缓存（Ctrl + Shift + Delete）
4. 硬刷新页面（Ctrl + F5）

---

## 📊 性能检查

### 前端性能
- [ ] 页面首次加载时间 < 2 秒
- [ ] TAB 切换响应时间 < 100ms
- [ ] 表单提交后反馈时间 < 300ms
- [ ] 列表滚动流畅，无卡顿

### 后端性能
- [ ] API 响应时间 < 500ms
- [ ] 数据库查询无 N+1 问题
- [ ] 无内存泄漏（长时间运行后检查）

---

## 🔒 安全检查

- [ ] 所有 API 端点都有 `authenticateToken` 中间件
- [ ] 前端路由有权限检查
- [ ] 密码字段使用 type="password"
- [ ] SQL 注入防护（Prisma ORM 自动处理）
- [ ] XSS 防护（React 自动转义）
- [ ] 敏感数据不在前端日志输出

---

## 📝 部署后验证

### 数据库验证
```bash
cd backend
npx prisma studio
```
- [ ] Role 表有 canAccessPurchase 字段，admin 角色该字段为 true
- [ ] Supplier 表存在且为空（或有测试数据）
- [ ] PurchaseOrder 表存在且为空（或有测试数据）

### API 验证
使用 Postman 或 curl 测试：

```bash
# 1. 登录获取 Token
curl -X POST http://localhost:5501/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'

# 2. 获取供应商列表（替换 YOUR_TOKEN）
curl -X GET http://localhost:5501/api/suppliers \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. 获取采购订单列表
curl -X GET http://localhost:5501/api/purchase-orders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

- [ ] 登录接口返回 token
- [ ] 供应商接口返回空数组 []
- [ ] 采购订单接口返回空数组 []

### 前端验证
- [ ] 浏览器控制台无错误（红色消息）
- [ ] 网络请求全部成功（200 或 201）
- [ ] 所有图标正确加载
- [ ] 样式正常渲染，无布局错乱

---

## ✅ 最终确认

- [ ] 所有功能测试通过
- [ ] 所有问题已解决
- [ ] 性能检查合格
- [ ] 安全检查通过
- [ ] 文档齐全
- [ ] 部署日志已记录

---

## 📞 支持联系

如果遇到无法解决的问题：

1. 检查 `PROCUREMENT_MODULE_COMPLETE.md` 文档
2. 查看 `PROCUREMENT_MODULE_PLAN.md` 了解详细设计
3. 检查浏览器开发者工具的 Console 和 Network 标签
4. 检查后端控制台的错误日志
5. 使用 Prisma Studio 检查数据库状态

---

**检查清单版本**: 1.0.0  
**创建日期**: 2026-06-02  
**最后更新**: 2026-06-02

**开始部署吧！祝顺利！** 🚀
