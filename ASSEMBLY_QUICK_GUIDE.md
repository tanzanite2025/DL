# BOM 组装功能 - 快速实施指南

## 当前状态

✅ 已完成：
1. 数据库架构（已迁移）
2. 后端权限字段（canAccessAssembly）
3. BOM 和组装 API 代码（在 assembly-apis.ts 文件中）

🚧 待完成：
1. 将 API 代码整合到 server.ts
2. 添加翻译
3. 创建简单的前端界面

---

## 步骤 1：整合后端 API （5分钟）

### 方法：复制粘贴

1. 打开 `backend/src/assembly-apis.ts`
2. 复制全部内容
3. 打开 `backend/src/server.ts`
4. 找到文件末尾的 `app.listen(PORT` 这一行（大约第 1509 行）
5. 在 `app.listen` **之前** 粘贴复制的内容
6. 删除第一行的注释（`// ==================== BOM 组装功能 API ====================` 等）
7. 保存文件

### 验证

重启后端服务：
```bash
# 停止后端（Ctrl+C）
cd backend
npm run dev
```

应该能正常启动，没有错误。

---

## 步骤 2：添加翻译 （3分钟）

打开 `frontend/src/i18n/translations.ts`

在 `zh` 对象末尾添加（在最后一个逗号后）：

```typescript
// BOM 组装功能
bomConfig: "BOM配置",
assemblyOperation: "组装操作",
productType: "产品类型",
typeMaterial: "原材料/零件",
typeProduct: "成品/组装件",
itemCost: "成本价",
configureBom: "配置 BOM 清单",
selectProduct: "选择成品",
addComponent: "添加零件",
componentItem: "零件名称",
requiredQty: "所需数量",
bomSaveSuccess: "BOM 配置保存成功",
assemblyQty: "组装数量",
disassemblyQty: "拆解数量",
executeAssembly: "执行组装",
executeDisassembly: "执行拆解",
stockCheck: "库存检查",
stockSufficient: "充足",
stockInsufficient: "不足",
assembleSuccess: "组装成功",
disassembleSuccess: "拆解成功",
errNoBomConfigured: "未配置 BOM 清单",
errStockInsufficient: "库存不足",
assemblyHistory: "组装历史",
typeAssemble: "组装",
typeDisassemble: "拆解",
needColumn: "需要",
stockColumn: "库存",
```

在 `en` 对象末尾添加：

```typescript
// BOM Assembly
bomConfig: "BOM Config",
assemblyOperation: "Assembly",
productType: "Product Type",
typeMaterial: "Material/Part",
typeProduct: "Finished Product",
itemCost: "Cost Price",
configureBom: "Configure BOM",
selectProduct: "Select Product",
addComponent: "Add Component",
componentItem: "Component",
requiredQty: "Required Qty",
bomSaveSuccess: "BOM saved",
assemblyQty: "Assembly Qty",
disassemblyQty: "Disassembly Qty",
executeAssembly: "Assemble",
executeDisassembly: "Disassemble",
stockCheck: "Stock Check",
stockSufficient: "Sufficient",
stockInsufficient: "Insufficient",
assembleSuccess: "Assembled",
disassembleSuccess: "Disassembled",
errNoBomConfigured: "BOM not configured",
errStockInsufficient: "Insufficient stock",
assemblyHistory: "Assembly History",
typeAssemble: "Assemble",
typeDisassemble: "Disassemble",
needColumn: "Need",
stockColumn: "Stock",
```

---

## 步骤 3：更新前端权限（2分钟）

### 3.1 更新 App.tsx

找到 `userPermission` 的两处类型定义，都添加 `canAccessAssembly: boolean`

### 3.2 更新 UsersPermissions.tsx

1. Role 接口添加 `canAccessAssembly: boolean`
2. 在权限矩阵表格添加"组装"列（参考采购管理的实现）

---

## 步骤 4：创建简单的组装界面（核心功能）

由于完整的3个TAB界面需要较多代码，先创建一个**最简单可用**的版本：

### 在产品管理页面添加"快速组装"按钮

这是最快的方式，让你能立即使用组装功能：

1. 在产品列表中，为每个"成品"类型的产品添加"组装"按钮
2. 点击后弹出模态框：
   - 选择仓库
   - 输入数量
   - 点击"执行组装"

### 示例代码（简化版）

```typescript
// 在 ProductsManagement.tsx 中添加组装功能

const [assemblyModal, setAssemblyModal] = useState(false);
const [selectedItem, setSelectedItem] = useState<any>(null);
const [assemblyQty, setAssemblyQty] = useState(1);
const [assemblyWarehouse, setAssemblyWarehouse] = useState('');

const handleAssemble = async () => {
  try {
    const res = await fetch('/api/assembly/assemble', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        assembledItemId: selectedItem.id,
        quantity: assemblyQty,
        warehouseId: assemblyWarehouse
      })
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    
    showToast('组装成功', 'success');
    setAssemblyModal(false);
  } catch (error: any) {
    showToast(error.message, 'error');
  }
};
```

---

## 测试流程

1. **登录系统** (admin / 123456)

2. **配置 BOM**（使用 API 工具或等待完整界面）
   ```bash
   # 使用 curl 或 Postman 测试
   POST http://localhost:3001/api/bom
   Headers: Authorization: Bearer YOUR_TOKEN
   Body:
   {
     "parentItemId": "成品ID",
     "components": [
       {
         "componentItemId": "零件1_ID",
         "quantity": 2
       },
       {
         "componentItemId": "零件2_ID",
         "quantity": 5
       }
     ]
   }
   ```

3. **执行组装**
   ```bash
   POST http://localhost:3001/api/assembly/assemble
   Body:
   {
     "assembledItemId": "成品ID",
     "quantity": 1,
     "warehouseId": "仓库ID"
   }
   ```

4. **检查结果**
   - 进入"货物流转"页面
   - 应该看到零件出库和成品入库记录

---

## 下一步完善（可选）

如果需要完整的界面：

1. 修改 ProductsManagement.tsx 添加3个TAB
2. TAB 1: 产品登记（添加类型和成本字段）
3. TAB 2: BOM 配置界面
4. TAB 3: 组装操作界面

但现在你已经有了**核心功能**，可以通过 API 或简单界面使用组装和拆解功能了！

---

## 如果遇到问题

1. **后端启动报错**
   - 检查 assembly-apis.ts 的代码是否正确复制到 server.ts
   - 确保在 `app.listen` 之前

2. **API 返回 403**
   - 进入权限管理，给admin角色勾选"组装"权限
   - 退出重新登录

3. **组装失败**
   - 检查是否已配置 BOM
   - 检查仓库中零件库存是否充足

---

**当前可用功能**：
- ✅ 数据库支持
- ✅ 所有 API 接口
- ✅ 权限控制
- ⚠️  简单界面（需要你添加）

**预计完成时间**：30分钟内可以让组装功能工作起来！