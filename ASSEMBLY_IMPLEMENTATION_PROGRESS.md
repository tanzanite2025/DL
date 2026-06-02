# BOM 组装功能实施进度

## ✅ 已完成

### 阶段 1：数据库架构 (100%)
- [x] Role 添加 `canAccessAssembly` 权限字段
- [x] Item 添加 `type` 字段（MATERIAL/PRODUCT）
- [x] Item 添加 `cost` 成本字段
- [x] 创建 BomComponent 表（BOM 清单）
- [x] 创建 AssemblyLog 表（组装记录）
- [x] 更新关联关系（User, Warehouse）
- [x] 执行数据库迁移

## 🚧 进行中

### 阶段 2：后端 API
- [ ] 更新种子数据（admin 角色添加 canAccessAssembly 权限）
- [ ] 更新 /api/auth/me 返回 canAccessAssembly
- [ ] 更新 /api/roles PUT 接口支持 canAccessAssembly
- [ ] BOM 配置 API
  - [ ] GET /api/bom - 获取所有 BOM 配置
  - [ ] GET /api/bom/:itemId - 获取指定成品的 BOM
  - [ ] POST /api/bom - 创建/更新 BOM 配置
  - [ ] DELETE /api/bom/:parentId/:componentId - 删除 BOM 零件
- [ ] 组装操作 API
  - [ ] POST /api/assembly/check - 检查库存是否可组装
  - [ ] POST /api/assembly/assemble - 执行组装
  - [ ] POST /api/assembly/disassemble - 执行拆解
  - [ ] GET /api/assembly/logs - 获取组装历史
- [ ] 更新 Item API 支持 type 和 cost 字段

### 阶段 3：国际化翻译
- [ ] 添加中文翻译（50+ 条）
- [ ] 添加英文翻译（50+ 条）

### 阶段 4：前端实现
- [ ] 更新 App.tsx
  - [ ] userPermission 添加 canAccessAssembly
  - [ ] 菜单不变（继续在产品管理中）
- [ ] 更新 UsersPermissions.tsx
  - [ ] Role 接口添加 canAccessAssembly
  - [ ] 权限矩阵添加"组装"列
- [ ] 改造 ProductsManagement.tsx
  - [ ] 添加 3 个 TAB 切换
  - [ ] TAB 1: 产品登记（改进，添加类型和成本）
  - [ ] TAB 2: BOM 配置
  - [ ] TAB 3: 组装操作

### 阶段 5：测试验证
- [ ] BOM 配置测试
- [ ] 组装功能测试
- [ ] 拆解功能测试
- [ ] 成本计算验证
- [ ] 权限控制测试

## 📝 下一步操作

正在实施：**阶段 2 - 后端 API**

预计完成时间：2-3 小时
