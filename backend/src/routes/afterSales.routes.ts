import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  allowsCounterpartyCapability,
  type CounterpartyRoleType,
} from '../lib/counterpartyRules.js';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

async function findCustomerCounterparty(id: string) {
  const counterparty = await prisma.counterparty.findUnique({ where: { id } });
  if (!counterparty || !allowsCounterpartyCapability(counterparty.roleType as CounterpartyRoleType, 'customer')) {
    return null;
  }

  return counterparty;
}

router.get('/after-sales', authenticateToken, requirePermission('canAccessAfterSales'), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const cases = await prisma.afterSalesCase.findMany({
      include: {
        counterparty: true,
        item: true,
        salesOrder: true,
        warehouse: true,
        goodsMove: true,
        handler: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const payload = cases.map((afterSalesCase) => ({
      ...afterSalesCase,
      handlerName: afterSalesCase.handler?.username ?? null,
    }));

    return res.json(payload);
  } catch (error) {
    console.error('[CRITICAL] Failed to fetch after-sales cases:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to fetch after-sales cases.' });
  }
});

router.post('/after-sales', authenticateToken, requirePermission('canAccessAfterSales'), async (req: AuthenticatedRequest, res: Response) => {
  const {
    receivedDate,
    counterpartyId,
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

  if (!counterpartyId || !itemId || !type || !warehouseId) {
    return res.status(400).json({ error: '[CRITICAL] Missing required after-sales fields.' });
  }

  try {
    const customer = await findCustomerCounterparty(counterpartyId);
    if (!customer) {
      return res.status(400).json({ error: '[CRITICAL] Selected counterparty is not customer-capable.' });
    }

    const handlerId = req.user?.id ?? null;
    const parsedQty = typeof qty === 'number' ? qty : parseInt(qty || '1', 10);

    const created = await prisma.afterSalesCase.create({
      data: {
        receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
        counterpartyId,
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
      include: {
        counterparty: true,
        item: true,
        salesOrder: true,
        warehouse: true,
        goodsMove: true,
        handler: true,
      },
    });

    return res.json({
      ...created,
      handlerName: created.handler?.username ?? null,
    });
  } catch (error) {
    console.error('[CRITICAL] Failed to create after-sales case:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to create after-sales case.' });
  }
});

router.put('/after-sales/:id', authenticateToken, requirePermission('canAccessAfterSales'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const {
    receivedDate,
    counterpartyId,
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
      return res.status(404).json({ error: '[CRITICAL] After-sales case not found.' });
    }

    const data: Record<string, unknown> = {};
    if (receivedDate) data.receivedDate = new Date(receivedDate);
    if (counterpartyId) {
      const customer = await findCustomerCounterparty(counterpartyId);
      if (!customer) {
        return res.status(400).json({ error: '[CRITICAL] Selected counterparty is not customer-capable.' });
      }
      data.counterpartyId = counterpartyId;
    }
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
            remarks: `After-sales case ${updatedCase.id} auto return receipt`,
          },
        });

        return tx.afterSalesCase.update({
          where: { id: updatedCase.id },
          data: { goodsMoveId: move.id },
          include: {
            counterparty: true,
            item: true,
            salesOrder: true,
            warehouse: true,
            goodsMove: true,
            handler: true,
          },
        });
      }

      return tx.afterSalesCase.findUniqueOrThrow({
        where: { id: updatedCase.id },
        include: {
          counterparty: true,
          item: true,
          salesOrder: true,
          warehouse: true,
          goodsMove: true,
          handler: true,
        },
      });
    });

    return res.json({
      ...updated,
      handlerName: updated.handler?.username ?? null,
    });
  } catch (error) {
    console.error('[CRITICAL] Failed to update after-sales case:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to update after-sales case.' });
  }
});

router.delete('/after-sales/:id', authenticateToken, requirePermission('canAccessAfterSales'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.afterSalesCase.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error('[CRITICAL] Failed to delete after-sales case:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to delete after-sales case.' });
  }
});

export default router;
