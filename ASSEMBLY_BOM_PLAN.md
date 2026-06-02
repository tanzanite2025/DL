# 产品组装（BOM）功能 - 实施方案

## 📋 功能概述

允许将多个零件/原材料组装成一个成品。例如：
- **轮组（成品）** = 碳纤维轮圈 + 辐条 + 花鼓
- **自行车（成品）** = 车架 + 轮组 + 变速器 + ...

## 🎯 业务场景

### 场景 1：生产组装
1. 仓库中有零件：轮圈(10个)、辐条(100根)、花鼓(20个)
2. 组装轮组：需要 1个轮圈 + 28根辐条 + 1个花鼓
3. 组装后：零件库存减少，成品库存增加

### 场景 2：拆解还原
1. 轮组成品需要拆解
2. 拆解后：成品库存减少，零件库存增加

### 场景 3：BOM 查询
1. 查看某个成品的组成清单
2. 计算可组装数量（根据零件库存）

## 🗄️ 数据库设计

### 1. 更新 Item 模型

添加产品类型字段：

```prisma
model Item {
  id             String          @id @default(uuid())
  code           String          @unique
  name           String
  unit           String          @default("件")
  description    String?
  type           String          @default("MATERIAL") // "MATERIAL" (原材料/零件), "PRODUCT" (成品/组装件)
  
  // 原有关系
  goodsMoves     GoodsMove[]
  salesOrders    SalesOrder[]
  purchaseOrders PurchaseOrder[]
  
  // 新增 BOM 关系
  bomComponents  BomComponent[]  @relation("ParentItem")      // 此物料作为成品时，包含哪些零件
  usedInBoms     BomComponent[]  @relation("ComponentItem")   // 此物料作为零件时，被哪些成品使用
  assemblyLogs   AssemblyLog[]   @relation("AssembledItem")   // 此物料作为成品的组装记录
  
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
}
```

### 2. 创建 BomComponent 表（BOM 清单）

```prisma
model BomComponent {
  id            String   @id @default(uuid())
  parentItemId  String   // 成品 ID
  parentItem    Item     @relation("ParentItem", fields: [parentItemId], references: [id], onDelete: Cascade)
  componentItemId String // 零件 ID
  componentItem Item     @relation("ComponentItem", fields: [componentItemId], references: [id], onDelete: Cascade)
  quantity      Int      // 所需数量
  remarks       String?  // 备注（如：规格要求）
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([parentItemId, componentItemId]) // 一个成品中同一零件只能出现一次
}
```

### 3. 创建 AssemblyLog 表（组装记录）

```prisma
model AssemblyLog {
  id             String    @id @default(uuid())
  type           String    // "ASSEMBLE" (组装), "DISASSEMBLE" (拆解)
  assembledItemId String   // 成品 ID
  assembledItem  Item      @relation("AssembledItem", fields: [assembledItemId], references: [id])
  quantity       Int       // 组装/拆解数量
  warehouseId    String    // 操作仓库
  warehouse      Warehouse @relation(fields: [warehouseId], references: [id])
  userId         String    // 操作员
  user           User      @relation(fields: [userId], references: [id])
  remarks        String?   // 备注
  createdAt      DateTime  @default(now())
}
```

### 4. 更新 Warehouse 和 User 模型

```prisma
model Warehouse {
  // ... 原有字段
  assemblyLogs  AssemblyLog[]
}

model User {
  // ... 原有字段
  assemblyLogs  AssemblyLog[]
}
```

## 🎨 前端设计

### 产品管理页面改造

添加第二个 TAB：**BOM 配置**

```
┌─────────────────────────────────────────┐
│  产品管理                                │
├─────────────────────────────────────────┤
│  [产品登记] [BOM 配置] [组装操作]        │
├─────────────────────────────────────────┤
│                                         │
│  TAB 1: 产品登记 (现有功能)              │
│  - 产品列表                              │
│  - 新增/编辑产品                         │
│  - 增加产品类型选择（原材料/成品）        │
│                                         │
│  TAB 2: BOM 配置                        │
│  - 选择成品                              │
│  - 配置组成零件及数量                     │
│  - 显示 BOM 清单列表                     │
│                                         │
│  TAB 3: 组装操作                        │
│  - 选择要组装的成品                       │
│  - 显示所需零件清单                       │
│  - 检查库存是否充足                       │
│  - 输入组装数量                          │
│  - 选择操作仓库                          │
│  - 执行组装/拆解                         │
│                                         │
└─────────────────────────────────────────┘
```

### TAB 1：产品登记（改进）

**新增字段**：
- 产品类型：[ ] 原材料/零件  [ ] 成品/组装件

### TAB 2：BOM 配置

**左侧 - BOM 配置表单**：
```
┌─────────────────────────────┐
│ 配置产品 BOM 清单            │
├─────────────────────────────┤
│ 成品：[选择下拉框]           │
│                             │
│ 添加零件：                   │
│ ┌─────────────┬───────┐     │
│ │ 零件名称     │ 数量  │     │
│ ├─────────────┼───────┤     │
│ │ 碳纤维轮圈   │  1   │ [X] │
│ │ 辐条        │  28  │ [X] │
│ │ 花鼓        │  1   │ [X] │
│ └─────────────┴───────┘     │
│                             │
│ [+ 添加零件]                │
│ [保存 BOM 配置]             │
└─────────────────────────────┘
```

**右侧 - BOM 清单列表**：
显示所有已配置 BOM 的成品及其组成

### TAB 3：组装操作

**组装表单**：
```
┌─────────────────────────────┐
│ 组装/拆解操作                │
├─────────────────────────────┤
│ 操作类型：[ ] 组装 [ ] 拆解  │
│ 成品：[选择]                │
│ 操作仓库：[选择]             │
│ 数量：[输入]                │
│                             │
│ 所需零件（自动计算）：        │
│ ┌─────────────┬────┬────┐   │
│ │ 零件        │需要│库存│   │
│ ├─────────────┼────┼────┤   │
│ │ 碳纤维轮圈   │ 2  │ 10 │ ✓ │
│ │ 辐条        │ 56 │100 │ ✓ │
│ │ 花鼓        │ 2  │ 20 │ ✓ │
│ └─────────────┴────┴────┘   │
│                             │
│ 库存检查：✓ 充足            │
│ [执行组装]                  │
└─────────────────────────────┘
```

**组装历史记录**：
显示组装/拆解操作日志

## 🔧 后端 API

### BOM 配置 API

```
GET    /api/bom/:itemId          - 获取某个成品的 BOM 清单
POST   /api/bom                  - 创建/更新 BOM 配置
DELETE /api/bom/:itemId/:componentId - 删除 BOM 中的某个零件
GET    /api/bom                  - 获取所有已配置 BOM 的成品列表
```

### 组装操作 API

```
POST   /api/assembly/assemble    - 执行组装操作
POST   /api/assembly/disassemble - 执行拆解操作
GET    /api/assembly/logs        - 获取组装历史记录
GET    /api/assembly/check       - 检查库存是否可以组装
```

### API 详细设计

#### POST /api/assembly/assemble

**请求体**：
```json
{
  "assembledItemId": "uuid",
  "quantity": 2,
  "warehouseId": "uuid",
  "remarks": "生产批次001"
}
```

**处理逻辑**：
1. 查询成品的 BOM 清单
2. 计算所需零件数量（BOM 数量 × 组装数量）
3. 检查仓库中各零件库存是否充足
4. 如果充足：
   - 创建零件出库流转记录（GoodsMove type=OUT）
   - 创建成品入库流转记录（GoodsMove type=IN）
   - 创建组装日志（AssemblyLog type=ASSEMBLE）
5. 事务提交

**响应**：
```json
{
  "success": true,
  "assemblyLog": { ... },
  "goodsMoves": [ ... ]
}
```

## 🌍 国际化翻译

### 中文翻译

```typescript
// TAB 标签
productsTab: "产品登记",
bomTab: "BOM配置",
assemblyTab: "组装操作",

// 产品类型
productType: "产品类型",
typeMaterial: "原材料/零件",
typeProduct: "成品/组装件",

// BOM 配置
bomConfiguration: "BOM 配置",
configureBom: "配置产品 BOM 清单",
selectProduct: "选择成品",
addComponent: "添加零件",
componentItem: "零件名称",
requiredQty: "所需数量",
bomList: "BOM 清单列表",
noBomConfigured: "暂无 BOM 配置",
bomSaveSuccess: "BOM 配置保存成功",
bomDeleteConfirm: "确认删除此零件吗？",

// 组装操作
assemblyOperation: "组装/拆解操作",
operationType: "操作类型",
typeAssemble: "组装",
typeDisassemble: "拆解",
assemblyQty: "组装数量",
disassemblyQty: "拆解数量",
requiredComponents: "所需零件清单",
stockCheck: "库存检查",
stockSufficient: "库存充足",
stockInsufficient: "库存不足",
executeAssembly: "执行组装",
executeDisassembly: "执行拆解",
assemblyHistory: "组装历史记录",
assembleSuccess: "组装操作成功",
disassembleSuccess: "拆解操作成功",
errStockInsufficient: "零件库存不足，无法组装",
errNoBomConfigured: "该成品未配置 BOM 清单",

// 表格列
needColumn: "需要",
stockColumn: "库存",
statusColumn: "状态",
```

### 英文翻译

```typescript
// TAB labels
productsTab: "Products",
bomTab: "BOM Config",
assemblyTab: "Assembly",

// Product types
productType: "Product Type",
typeMaterial: "Material/Part",
typeProduct: "Finished Product",

// BOM configuration
bomConfiguration: "BOM Configuration",
configureBom: "Configure Product BOM",
selectProduct: "Select Product",
addComponent: "Add Component",
componentItem: "Component",
requiredQty: "Required Qty",
bomList: "BOM List",
noBomConfigured: "No BOM configured",
bomSaveSuccess: "BOM saved successfully",
bomDeleteConfirm: "Delete this component?",

// Assembly operations
assemblyOperation: "Assembly/Disassembly",
operationType: "Operation Type",
typeAssemble: "Assemble",
typeDisassemble: "Disassemble",
assemblyQty: "Assembly Qty",
disassemblyQty: "Disassembly Qty",
requiredComponents: "Required Components",
stockCheck: "Stock Check",
stockSufficient: "Sufficient",
stockInsufficient: "Insufficient",
executeAssembly: "Execute Assembly",
executeDisassembly: "Execute Disassembly",
assemblyHistory: "Assembly History",
assembleSuccess: "Assembly completed",
disassembleSuccess: "Disassembly completed",
errStockInsufficient: "Insufficient stock",
errNoBomConfigured: "BOM not configured",

// Table columns
needColumn: "Need",
stockColumn: "Stock",
statusColumn: "Status",
```

## 📊 业务流程

### 组装流程

```
1. 用户选择要组装的成品（如：轮组）
   ↓
2. 系统查询轮组的 BOM 清单
   配置：1个轮圈 + 28根辐条 + 1个花鼓
   ↓
3. 用户输入组装数量：2
   系统计算所需零件：
   - 轮圈：2个
   - 辐条：56根
   - 花鼓：2个
   ↓
4. 系统检查仓库库存
   - 轮圈库存：10个 ✓
   - 辐条库存：100根 ✓
   - 花鼓库存：20个 ✓
   ↓
5. 库存充足，执行组装
   ↓
6. 系统自动创建流转记录：
   - 零件出库（轮圈 -2, 辐条 -56, 花鼓 -2）
   - 成品入库（轮组 +2）
   ↓
7. 创建组装日志
   ↓
8. 完成✓
```

### 拆解流程

```
1. 用户选择要拆解的成品
   ↓
2. 检查成品库存是否充足
   ↓
3. 执行拆解
   ↓
4. 系统自动创建流转记录：
   - 成品出库
   - 零件入库（按 BOM 配置比例）
   ↓
5. 创建拆解日志
   ↓
6. 完成✓
```

## 🎯 实施步骤

### 阶段 1：数据库（1小时）
1. 更新 Prisma schema
2. 添加 Item.type 字段
3. 创建 BomComponent 表
4. 创建 AssemblyLog 表
5. 运行迁移

### 阶段 2：后端 API（2-3小时）
1. BOM 配置 API（CRUD）
2. 组装操作 API
3. 库存检查逻辑
4. 事务处理确保数据一致性

### 阶段 3：前端页面（3-4小时）
1. 产品登记 TAB 添加类型选择
2. 新增 BOM 配置 TAB
3. 新增组装操作 TAB
4. 库存检查 UI 反馈

### 阶段 4：测试（1小时）
1. BOM 配置测试
2. 组装功能测试
3. 拆解功能测试
4. 库存计算验证

## 💡 高级功能（未来扩展）

1. **多级 BOM**：成品可以包含子成品
   - 例如：自行车 → 轮组 → 轮圈、辐条、花鼓
   
2. **工艺路线**：记录组装步骤和工时

3. **成本计算**：根据 BOM 自动计算成品成本

4. **可替代零件**：一个位置可以用多种零件

5. **批次追溯**：记录每个成品使用的零件批次

## 📝 注意事项

1. **库存检查**：组装前必须检查所有零件库存是否充足
2. **事务处理**：组装操作必须在数据库事务中进行
3. **权限控制**：组装操作应该有独立权限
4. **日志记录**：所有组装/拆解操作必须记录日志
5. **并发控制**：避免同时组装导致库存扣减错误

---

**文档版本**: 1.0  
**创建时间**: 2026-06-02  
**状态**: 待确认

**下一步**：确认方案后开始实施
