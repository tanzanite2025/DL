import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

// ---------------------- 开发者模式清库 API ----------------------
router.delete('/clear-all-demo-data', async (req: Request, res: Response) => {
  try {
    await prisma.assemblyLog.deleteMany();
    await prisma.goodsMove.deleteMany();
    await prisma.salesOrder.deleteMany();
    await prisma.purchaseOrder.deleteMany();
    await prisma.bomComponent.deleteMany();
    await prisma.financialBill.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.item.deleteMany();
    await prisma.warehouse.deleteMany();
    return res.json({ success: true, message: '业务演示数据已全部清空，保留了系统账号与主数据配置。' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: '[CRITICAL] 数据清理执行失败。' });
  }
});

export default router;
