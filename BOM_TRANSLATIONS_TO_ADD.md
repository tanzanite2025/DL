# BOM 组装功能 - 翻译补丁

## 使用方法

打开 `frontend/src/i18n/translations.ts`

### 1. 在 `zh` 对象中，找到 `permissionPurchase: "采购管理",` 这一行

在这行**后面**添加以下内容：

```typescript
    permissionAssembly: "组装",
    
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
    noBomComponents: "未配置任何零件",
    bomComponents: "BOM 清单零件",
```

### 2. 在 `en` 对象中，找到 `permissionPurchase: "Procurement",` 这一行

在这行**后面**添加以下内容：

```typescript
    permissionAssembly: "Assembly",
    
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
    noBomComponents: "No components configured",
    bomComponents: "BOM Components",
```

### 3. 保存文件

完成！翻译已添加。
