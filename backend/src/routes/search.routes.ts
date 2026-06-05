import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

router.get('/search', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const rawQ = String(req.query.q || '').trim();

  if (!rawQ) {
    return res.json({
      query: '',
      counterparties: [],
      items: [],
      salesOrders: [],
      purchaseOrders: [],
      afterSalesCases: [],
      warehouses: [],
    });
  }

  const q = rawQ;

  try {
    let canSales = false;
    let canPurchase = false;
    let canGoods = false;
    let canWarehouse = false;
    let canAfterSales = false;

    if (req.user?.roleId) {
      const role = await prisma.role.findUnique({ where: { id: req.user.roleId } });
      if (role) {
        const isSystemAdmin = role.protected;
        canSales = isSystemAdmin || !!role.canAccessSales;
        canPurchase = isSystemAdmin || !!role.canAccessPurchase;
        canGoods = isSystemAdmin || !!role.canAccessGoods || !!role.canAccessProducts;
        canWarehouse = isSystemAdmin || !!role.canAccessWarehouse;
        canAfterSales = isSystemAdmin || !!role.canAccessAfterSales;
      }
    }

    const results = {
      query: q,
      counterparties: [] as any[],
      items: [] as any[],
      salesOrders: [] as any[],
      purchaseOrders: [] as any[],
      afterSalesCases: [] as any[],
      warehouses: [] as any[],
    };

    if (canSales) {
      results.counterparties = await prisma.counterparty.findMany({
        where: {
          AND: [
            { OR: [{ roleType: 'CUSTOMER' }, { roleType: 'BOTH' }] },
            {
              OR: [
                { name: { contains: q } },
                { code: { contains: q } },
                { phone: { contains: q } },
                { email: { contains: q } },
                { address: { contains: q } },
              ],
            },
          ],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

      const salesOrders = await prisma.salesOrder.findMany({
        where: {
          OR: [
            { orderNo: { contains: q } },
            { counterparty: { name: { contains: q } } },
            { item: { name: { contains: q } } },
          ],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          counterparty: true,
          item: true,
          currency: true,
        },
      });
      results.salesOrders = salesOrders;
    }

    if (canPurchase) {
      const purchaseOrders = await prisma.purchaseOrder.findMany({
        where: {
          OR: [
            { orderNo: { contains: q } },
            { counterparty: { name: { contains: q } } },
            { item: { name: { contains: q } } },
          ],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          counterparty: true,
          item: true,
          currency: true,
        },
      });
      results.purchaseOrders = purchaseOrders;
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
      const afterSalesCases = await prisma.afterSalesCase.findMany({
        where: {
          OR: [
            { shipmentTrackingNumber: { contains: q } },
            { note: { contains: q } },
            { counterparty: { name: { contains: q } } },
            { item: { name: { contains: q } } },
          ],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          counterparty: true,
          item: true,
          warehouse: true,
        },
      });
      results.afterSalesCases = afterSalesCases;
    }

    return res.json(results);
  } catch (error) {
    console.error('[CRITICAL] Global search failed:', error);
    return res.status(500).json({ error: '[CRITICAL] Global search failed.' });
  }
});

export default router;
