import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

// 售后单列表
router.get('/after-sales', authenticateToken, requirePermission('canAccessAfterSales'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cases = await prisma.afterSalesCase.findMany({
      include: {
        customer: true,
        item: true,
        salesOrder: true,
        warehouse: true,
        goodsMove: true,
        handler: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const payload = cases.map((c: any) => ({
      ...c,
      handlerName: c.handler?.username ?? null,
    }));

    return res.json(payload);
  } catch (error) {
    console.error('[CRITICAL] 无法拉取售后记录：', error);
    return res.status(500).json({ error: '[CRITICAL] 无法拉取售后记录。' });
  }
});

// 创建售后单
router.post('/after-sales', authenticateToken, requirePermission('canAccessAfterSales'), async (req: AuthenticatedRequest, res: Response) => {
  const {
    receivedDate,
    customerId,
    itemId,
    qty,
    type,
    salesOrderId,
    warehouseId,
    shipmentTrackingNumber,
    customerAddressSnapshot,
    shipBackAddress,
    note,
    status,
  } = req.body;

  if (!receivedDate || !customerId || !itemId || !type || !warehouseId) {
    return res.status(400).json({ error: '[CRITICAL] 售后单缺少必要字段（收到日期、客户、产品、类型、退回仓库）。' });
  }

  try {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return res.status(400).json({ error: '[CRITICAL] 指定客户不存在。' });
    }

    const handlerId = req.user?.id ?? null;
    const parsedQty = typeof qty === 'number' ? qty : parseInt(qty || '1', 10);

    const created = await prisma.afterSalesCase.create({
      data: {
        receivedDate: new Date(receivedDate),
        customerId,
        customerAddressSnapshot: customerAddressSnapshot ?? customer.address ?? null,
        itemId,
        qty: Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : 1,
        salesOrderId: salesOrderId || null,
        warehouseId: warehouseId || null,
        shipmentTrackingNumber: shipmentTrackingNumber ?? null,
        type,
        processedDate: null,
        shipBackAddress: shipBackAddress ?? null,
        note: note ?? null,
        handlerId,
        status: status || 'PENDING',
      },
    });

    return res.json(created);
  } catch (error) {
    console.error('[CRITICAL] 创建售后记录失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 创建售后记录失败。' });
  }
});

// 更新售后单
router.put('/after-sales/:id', authenticateToken, requirePermission('canAccessAfterSales'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const {
    receivedDate,
    customerId,
    itemId,
    qty,
    type,
    salesOrderId,
    warehouseId,
    shipmentTrackingNumber,
    customerAddressSnapshot,
    processedDate,
    shipBackAddress,
    note,
    status,
  } = req.body;

  try {
    const existing = await prisma.afterSalesCase.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: '[CRITICAL] 找不到该售后记录。' });
    }

    const data: any = {};
    if (receivedDate) data.receivedDate = new Date(receivedDate);
    if (customerId) data.customerId = customerId;
    if (typeof customerAddressSnapshot !== 'undefined') data.customerAddressSnapshot = customerAddressSnapshot;
    if (itemId) data.itemId = itemId;
    if (typeof salesOrderId !== 'undefined') data.salesOrderId = salesOrderId || null;
    if (typeof warehouseId !== 'undefined') data.warehouseId = warehouseId || null;
    if (typeof shipmentTrackingNumber !== 'undefined') data.shipmentTrackingNumber = shipmentTrackingNumber;
    if (typeof qty !== 'undefined') {
      const parsedQty = typeof qty === 'number' ? qty : parseInt(qty || '1', 10);
      data.qty = Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : existing.qty;
    }
    if (type) data.type = type;
    if (typeof processedDate !== 'undefined') data.processedDate = processedDate ? new Date(processedDate) : null;
    if (typeof shipBackAddress !== 'undefined') data.shipBackAddress = shipBackAddress;
    if (typeof note !== 'undefined') data.note = note;
    if (status) data.status = status;

    const userId = req.user?.id;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedCase = await tx.afterSalesCase.update({
        where: { id },
        data,
      });

      const shouldCreateGoodsMove =
        (updatedCase.type === 'RETURN' || updatedCase.type === 'EXCHANGE') &&
        updatedCase.status === 'DONE' &&
        !!updatedCase.warehouseId &&
        !updatedCase.goodsMoveId;

      if (shouldCreateGoodsMove && userId) {
        const move = await tx.goodsMove.create({
          data: {
            itemId: updatedCase.itemId,
            qty: updatedCase.qty,
            type: 'IN',
            fromWarehouseId: null,
            toWarehouseId: updatedCase.warehouseId,
            userId,
            remarks: `售后单 ${updatedCase.id} 自动退货入库`,
          },
        });

        const withLink = await tx.afterSalesCase.update({
          where: { id: updatedCase.id },
          data: { goodsMoveId: move.id },
        });

        return withLink;
      }

      return updatedCase;
    });

    return res.json(updated);
  } catch (error) {
    console.error('[CRITICAL] 更新售后记录失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 更新售后记录失败。' });
  }
});

// 删除售后单
router.delete('/after-sales/:id', authenticateToken, requirePermission('canAccessAfterSales'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.afterSalesCase.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error('[CRITICAL] 删除售后记录失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 删除售后记录失败。' });
  }
});

export default router;
