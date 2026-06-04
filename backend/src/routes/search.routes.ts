import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

// 全局搜索：根据关键字在多个核心模块中做模糊匹配
router.get('/search', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const rawQ = String(req.query.q || '').trim();

  if (!rawQ) {
    return res.json({
      query: '',
      customers: [],
      items: [],
      salesOrders: [],
      purchaseOrders: [],
      afterSalesCases: [],
      warehouses: [],
    });
  }

  const q = rawQ;

  try {
    // 读取角色权限，用于决定可见模块
    let canSales = false;
    let canPurchase = false;
    let canGoods = false;
    let canWarehouse = false;
    let canAfterSales = false;

    if (req.user?.roleId) {
      const role = await prisma.role.findUnique({ where: { id: req.user.roleId } });
      if (role) {
        const isSystemAdmin = role.protected && role.name === '系统管理员';
        canSales = isSystemAdmin || !!role.canAccessSales;
        canPurchase = isSystemAdmin || !!role.canAccessPurchase;
        canGoods = isSystemAdmin || !!role.canAccessGoods || !!role.canAccessProducts;
        canWarehouse = isSystemAdmin || !!role.canAccessWarehouse;
        canAfterSales = isSystemAdmin || !!role.canAccessAfterSales;
      }
    }

    const results = {
      query: q,
      customers: [] as any[],
      items: [] as any[],
      salesOrders: [] as any[],
      purchaseOrders: [] as any[],
      afterSalesCases: [] as any[],
      warehouses: [] as any[],
    };

    if (canSales) {
      results.customers = await prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { code: { contains: q } },
            { phone: { contains: q } },
            { email: { contains: q } },
            { address: { contains: q } },
          ],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

      results.salesOrders = await prisma.salesOrder.findMany({
        where: {
          OR: [
            { orderNo: { contains: q } },
            { customer: { name: { contains: q } } },
            { item: { name: { contains: q } } },
          ],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          item: true,
          currency: true,
        },
      });
    }

    if (canPurchase) {
      results.purchaseOrders = await prisma.purchaseOrder.findMany({
        where: {
          OR: [
            { orderNo: { contains: q } },
            { supplier: { name: { contains: q } } },
            { item: { name: { contains: q } } },
          ],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: true,
          item: true,
          currency: true,
        },
      });
    }

    if (canGoods) {
      results.items = await prisma.item.findMany({
        where: {
          OR: [
            { code: { contains: q } },
            { name: { contains: q } },
            { description: { contains: q } },
          ],
        },
        take: 5,
        orderBy: { code: 'asc' },
        include: { currency: true },
      });
    }

    if (canWarehouse) {
      results.warehouses = await prisma.warehouse.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { location: { contains: q } },
          ],
        },
        take: 5,
        orderBy: { createdAt: 'asc' },
      });
    }

    if (canAfterSales) {
      results.afterSalesCases = await prisma.afterSalesCase.findMany({
        where: {
          OR: [
            { shipmentTrackingNumber: { contains: q } },
            { note: { contains: q } },
            { customer: { name: { contains: q } } },
            { item: { name: { contains: q } } },
          ],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          item: true,
          warehouse: true,
        },
      });
    }

    return res.json(results);
  } catch (error) {
    console.error('[CRITICAL] 全局搜索失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 全局搜索失败。' });
  }
});

export default router;
