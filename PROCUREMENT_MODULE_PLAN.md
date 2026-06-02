# 采购管理与供应商管理模块 - 实施方案

## 📋 功能概述

新增一个独立的TAB页面：**采购管理（Procurement）**，包含：
1. **供应商管理** - 供应商信息登记与维护
2. **采购订单管理** - 创建、跟踪采购订单
3. **采购入库** - 关联采购订单的入库流程

## 🗄️ 数据库变更

### 1. 新增 Supplier（供应商）表

```prisma
model Supplier {
  id              String          @id @default(uuid())
  code            String          @unique // 自动生成 SUPP-001 格式
  name            String          @unique
  contactPerson   String?         // 联系人
  phone           String?
  email           String?
  address         String?
  remarks         String?
  purchaseOrders  PurchaseOrder[]
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
}
```

### 2. 新增 PurchaseOrder（采购订单）表

```prisma
model PurchaseOrder {
  id          String    @id @default(uuid())
  orderNo     String    @unique // 自动生成 PO-001 格式
  supplierId  String
  supplier    Supplier  @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  itemId      String
  item        Item      @relation(fields: [itemId], references: [id])
  qty         Int
  price       Float     // 采购单价
  totalPrice  Float     // 总价
  status      String    // "DRAFT" (草稿), "CONFIRMED" (已确认), "RECEIVED" (已收货), "CLOSED" (已关闭)
  expectedDate DateTime?// 期望到货日期
  receivedQty Int       @default(0) // 已收货数量
  orderDate   DateTime  @default(now())
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

### 3. 更新 Item 表

在现有 Item 模型中添加关系：

```prisma
model Item {
  // ... 现有字段
  purchaseOrders PurchaseOrder[]
}
```

### 4. 更新 Role 表

添加采购模块权限字段：

```prisma
model Role {
  // ... 现有字段
  canAccessPurchase Boolean @default(false)
}
```

### 5. 数据库迁移命令

```bash
cd backend
npx prisma migrate dev --name add_procurement_module
npx prisma generate
```

## 🎨 前端组件结构

### 文件结构

```
frontend/src/pages/
├── ProcurementManagement.tsx  (新增 - 主页面，包含供应商和采购订单管理)
```

### 页面布局

采用**双TAB切换**设计（类似 FinanceARAP.tsx）：
- **TAB 1: 供应商管理** - 供应商列表、新增/编辑供应商
- **TAB 2: 采购订单** - 采购订单列表、新增/编辑订单、收货登记

## 🔐 权限集成

### 1. 更新 App.tsx 路由

```typescript
const menuItems = [
  // ... 现有菜单项
  {
    path: '/procurement',
    label: t('procurementMenu'),
    icon: <ShoppingCart size={16} />,
    allowed: userPermission?.canAccessPurchase ?? false
  }
];
```

### 2. 添加路由配置

```typescript
{userPermission?.canAccessPurchase && (
  <Route
    path="/procurement"
    element={<ProcurementManagement token={token} showToast={showToast} />}
  />
)}
```

### 3. 更新 UsersPermissions 页面

在权限矩阵表格中添加一列：

```typescript
<th className="text-[9px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-center">
  {t('permissionPurchase')}
</th>

// 表格行中添加复选框
<td className="py-4 text-center">
  <input
    type="checkbox"
    checked={role.canAccessPurchase}
    onChange={() => handleTogglePermission(role.id, 'canAccessPurchase')}
    className="h-4 w-4 rounded border-dashed border-neutral-700 bg-neutral-900 text-white focus:ring-0 cursor-pointer accent-white"
  />
</td>
```

## 🌍 国际化翻译

### 中文翻译 (zh)

```typescript
// 侧边栏菜单
procurementMenu: "采购管理",

// 采购管理页面
procurementHeader: "采购管理与供应商控制",
procurementDesc: "登记和维护供应商信息，创建和跟踪采购订单，管理采购入库流程。",

// TAB 标签
suppliersTab: "供应商管理",
purchaseOrdersTab: "采购订单",

// 供应商管理
supplierManagement: "供应商管理",
registerSupplier: "登记供应商",
editSupplier: "编辑供应商",
supplierCode: "供应商编码",
supplierName: "供应商名称",
supplierNamePlaceholder: "例如：XX钢铁供应商",
contactPerson: "联系人",
contactPersonPlaceholder: "请输入联系人姓名",
supplierPhone: "联系电话",
supplierEmail: "电子邮箱",
supplierAddress: "供应商地址",
supplierRemarks: "备注说明",
supplierList: "已登记供应商名册",
noSuppliersRegistered: "未登记任何供应商",
supplierDeleteConfirm: "确认删除此供应商吗？如果该供应商已有采购订单，删除将失败。",
supplierDeletedSuccess: "供应商删除成功",
supplierCreatedSuccess: "供应商登记成功",
supplierUpdatedSuccess: "供应商信息更新成功",
errSupplierFormRequired: "供应商名称为必填项",

// 采购订单管理
purchaseOrderManagement: "采购订单管理",
createPurchaseOrder: "创建采购订单",
editPurchaseOrder: "编辑采购订单",
orderNo: "订单编号",
selectSupplier: "选择供应商",
selectItem: "选择物料",
purchaseQty: "采购数量",
purchasePrice: "采购单价（元）",
totalPrice: "订单总价",
expectedDeliveryDate: "期望到货日期",
orderStatus: "订单状态",
statusDraft: "草稿",
statusConfirmed: "已确认",
statusReceived: "已收货",
statusClosed: "已关闭",
receivedQty: "已收货数量",
confirmOrder: "确认订单",
receiveGoods: "收货登记",
receiveGoodsTitle: "采购收货登记",
receiveQtyLabel: "本次收货数量",
targetWarehouse: "目标收货仓库",
registerReceiving: "确认收货入库",
purchaseOrderList: "采购订单台账",
noPurchaseOrders: "暂无采购订单记录。",
orderCreatedSuccess: "采购订单创建成功",
orderUpdatedSuccess: "采购订单更新成功",
orderDeleteConfirm: "确定要删除此采购订单吗？",
orderDeletedSuccess: "采购订单删除成功",
goodsReceivedSuccess: "收货登记成功，已自动入库",
errPurchaseFormRequired: "供应商、物料、数量和单价为必填项",
errReceiveQtyInvalid: "收货数量必须大于0且不能超过未收货数量",
errLoadProcurementData: "无法拉取采购数据",

// 权限配置
permissionPurchase: "采购管理",
```

### 英文翻译 (en)

```typescript
// Sidebar menu
procurementMenu: "Procurement",

// Procurement page
procurementHeader: "Procurement & Supplier Control",
procurementDesc: "Register and maintain supplier information, create and track purchase orders, manage procurement receiving process.",

// TAB labels
suppliersTab: "Suppliers",
purchaseOrdersTab: "Purchase Orders",

// Supplier management
supplierManagement: "Supplier Management",
registerSupplier: "Register Supplier",
editSupplier: "Edit Supplier",
supplierCode: "Supplier Code",
supplierName: "Supplier Name",
supplierNamePlaceholder: "e.g., XX Steel Supplier",
contactPerson: "Contact Person",
contactPersonPlaceholder: "Enter contact name",
supplierPhone: "Contact Phone",
supplierEmail: "Email",
supplierAddress: "Supplier Address",
supplierRemarks: "Remarks",
supplierList: "Registered Suppliers",
noSuppliersRegistered: "No suppliers registered",
supplierDeleteConfirm: "Confirm delete this supplier? Will fail if purchase orders exist.",
supplierDeletedSuccess: "Supplier deleted successfully",
supplierCreatedSuccess: "Supplier registered successfully",
supplierUpdatedSuccess: "Supplier updated successfully",
errSupplierFormRequired: "Supplier name is required",

// Purchase order management
purchaseOrderManagement: "Purchase Order Management",
createPurchaseOrder: "Create Purchase Order",
editPurchaseOrder: "Edit Purchase Order",
orderNo: "Order No",
selectSupplier: "Select Supplier",
selectItem: "Select Item",
purchaseQty: "Purchase Qty",
purchasePrice: "Unit Price (¥)",
totalPrice: "Total Price",
expectedDeliveryDate: "Expected Delivery Date",
orderStatus: "Order Status",
statusDraft: "Draft",
statusConfirmed: "Confirmed",
statusReceived: "Received",
statusClosed: "Closed",
receivedQty: "Received Qty",
confirmOrder: "Confirm Order",
receiveGoods: "Receive Goods",
receiveGoodsTitle: "Procurement Receiving",
receiveQtyLabel: "Receive Qty",
targetWarehouse: "Target Warehouse",
registerReceiving: "Confirm Receiving",
purchaseOrderList: "Purchase Orders Ledger",
noPurchaseOrders: "No purchase orders logged.",
orderCreatedSuccess: "Purchase order created successfully",
orderUpdatedSuccess: "Purchase order updated successfully",
orderDeleteConfirm: "Confirm delete this purchase order?",
orderDeletedSuccess: "Purchase order deleted successfully",
goodsReceivedSuccess: "Goods received and stored successfully",
errPurchaseFormRequired: "Supplier, Item, Qty and Price are required",
errReceiveQtyInvalid: "Receive qty must be greater than 0 and not exceed pending qty",
errLoadProcurementData: "Failed to fetch procurement data",

// Permission config
permissionPurchase: "Procurement",
```

## 🔧 后端 API 接口

### Supplier 相关

```
GET    /api/suppliers          - 获取供应商列表
POST   /api/suppliers          - 创建供应商
PUT    /api/suppliers/:id      - 更新供应商
DELETE /api/suppliers/:id      - 删除供应商
```

### PurchaseOrder 相关

```
GET    /api/purchase-orders             - 获取采购订单列表
POST   /api/purchase-orders             - 创建采购订单
PUT    /api/purchase-orders/:id         - 更新采购订单
DELETE /api/purchase-orders/:id         - 删除采购订单
POST   /api/purchase-orders/:id/receive - 收货登记（自动创建入库流转记录）
```

### 收货逻辑

当调用 `/api/purchase-orders/:id/receive` 时：
1. 更新采购订单的 `receivedQty`
2. 如果 `receivedQty >= qty`，自动将状态更新为 `RECEIVED`
3. 自动创建一条 `GoodsMove` 记录，类型为 `IN`，关联到指定仓库
4. 在备注中记录采购订单号

## 📊 核心功能流程

### 1. 供应商管理流程
```
登记供应商 → 填写基本信息 → 保存 → 供应商列表展示
       ↓
    编辑/删除供应商（有订单关联时不可删除）
```

### 2. 采购订单流程
```
创建订单（草稿） → 选择供应商和物料 → 填写数量和单价 → 保存
       ↓
   确认订单 → 状态变为"已确认"
       ↓
   收货登记 → 选择仓库 → 填写收货数量 → 自动创建入库流转
       ↓
   全部收货 → 状态自动变为"已收货"
       ↓
   关闭订单 → 状态变为"已关闭"
```

### 3. 与库存模块集成
- 采购收货自动创建 `GoodsMove` (IN 类型)
- 在货物流转明细中可以看到关联的采购订单号
- 库存数量自动更新

### 4. 与财务模块集成（未来扩展）
- 采购订单金额可以自动生成应付账单
- 关联供应商信息到财务往来单位

## 🎯 实施步骤

### 阶段 1: 数据库和后端（2-3小时）
1. ✅ 更新 Prisma schema
2. ✅ 运行数据库迁移
3. ✅ 创建 Supplier API 路由
4. ✅ 创建 PurchaseOrder API 路由
5. ✅ 实现收货逻辑（关联 GoodsMove）

### 阶段 2: 前端页面（3-4小时）
1. ✅ 添加翻译键到 translations.ts
2. ✅ 创建 ProcurementManagement.tsx 组件
3. ✅ 实现供应商管理 TAB
4. ✅ 实现采购订单管理 TAB
5. ✅ 实现收货登记功能

### 阶段 3: 权限和集成（1小时）
1. ✅ 更新 Role 模型添加 canAccessPurchase
2. ✅ 更新 UsersPermissions 权限矩阵
3. ✅ 更新 App.tsx 路由和菜单
4. ✅ 测试权限控制

### 阶段 4: 测试和优化（1小时）
1. ✅ 功能测试（CRUD、收货流程）
2. ✅ 权限测试
3. ✅ 中英文切换测试
4. ✅ 数据关联测试（与库存、供应商）

## 📱 UI/UX 设计建议

### 布局风格
- 沿用 UDS 1.0 设计系统
- 采用与 FinanceARAP 相同的双TAB切换设计
- 卡片、表格、表单保持一致风格

### 图标建议
```typescript
import { ShoppingCart, Package, TruckIcon, Users } from 'lucide-react';

// 侧边栏菜单图标
<ShoppingCart size={16} />

// 供应商图标
<Users size={14} />

// 采购订单图标
<Package size={14} />

// 收货图标
<TruckIcon size={14} />
```

### 状态徽章配色
```typescript
// 草稿
<UdsBadge status="default">{t('statusDraft')}</UdsBadge>

// 已确认
<UdsBadge status="alert">{t('statusConfirmed')}</UdsBadge>

// 已收货
<UdsBadge status="healthy">{t('statusReceived')}</UdsBadge>

// 已关闭
<UdsBadge status="critical">{t('statusClosed')}</UdsBadge>
```

## 🔗 与现有模块的关联

### 1. 与仓库管理的关联
- 采购收货时需要选择目标仓库
- 使用现有的 Warehouse 数据

### 2. 与产品管理的关联
- 采购订单关联现有的 Item（物料）
- 使用现有的 Item 数据

### 3. 与货物流转的关联
- 收货自动生成入库流转记录
- 在流转明细中显示关联的采购订单号

### 4. 与财务管理的关联（未来）
- 采购订单可以生成应付账单
- 供应商作为财务往来单位

## 🚦 验收标准

### 功能完整性
- ✅ 供应商的增删改查
- ✅ 采购订单的增删改查
- ✅ 订单状态流转（草稿→已确认→已收货→已关闭）
- ✅ 收货登记自动入库
- ✅ 权限控制正常工作

### 用户体验
- ✅ 中英文切换无混杂
- ✅ 表单验证友好
- ✅ 错误提示清晰
- ✅ 操作反馈及时

### 数据一致性
- ✅ 供应商有订单时不可删除
- ✅ 收货数量不超过订单数量
- ✅ 入库流转记录正确生成
- ✅ 库存数量正确更新

## 📝 注意事项

1. **数据校验**
   - 采购单价必须大于0
   - 收货数量不能超过未收货数量
   - 供应商名称唯一性校验

2. **业务逻辑**
   - 收货可以分批次进行（部分收货）
   - 全部收货后状态自动变更
   - 收货时自动创建入库流转，备注中记录订单号

3. **性能优化**
   - 采购订单列表支持分页（如数据量大）
   - 使用乐观更新提升用户体验

4. **未来扩展**
   - 采购退货功能
   - 采购质检流程
   - 与财务模块深度集成
   - 供应商评价体系

---

**文档版本**: 1.0
**创建时间**: 2026-06-02
**状态**: 待实施
