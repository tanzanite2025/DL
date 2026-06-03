const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('开始清理演示业务数据...');

  try {
    // 按照依赖关系的倒序删除，以规避外键约束报错
    await prisma.assemblyLog.deleteMany();
    console.log('已清理 AssemblyLog');
    
    await prisma.goodsMove.deleteMany();
    console.log('已清理 GoodsMove');
    
    await prisma.salesOrder.deleteMany();
    console.log('已清理 SalesOrder');
    
    await prisma.purchaseOrder.deleteMany();
    console.log('已清理 PurchaseOrder');
    
    await prisma.bomComponent.deleteMany();
    console.log('已清理 BomComponent');

    await prisma.financialBill.deleteMany();
    console.log('已清理 FinancialBill');
    
    await prisma.customer.deleteMany();
    console.log('已清理 Customer');
    
    await prisma.supplier.deleteMany();
    console.log('已清理 Supplier');
    
    await prisma.item.deleteMany();
    console.log('已清理 Item');
    
    await prisma.warehouse.deleteMany();
    console.log('已清理 Warehouse');
    
    console.log('所有业务演示数据已清理完毕！(已保留操作员账号、权限角色、收款账户和货币基础配置)');
  } catch (err) {
    console.error('清理数据时出错:', err);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
