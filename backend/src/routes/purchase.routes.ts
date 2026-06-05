import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  allowsCounterpartyCapability,
  type CounterpartyRoleType,
} from '../lib/counterpartyRules.js';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

async function findSupplierCounterparty(id: string) {
  const counterparty = await prisma.counterparty.findUnique({ where: { id } });
  if (!counterparty || !allowsCounterpartyCapability(counterparty.roleType as CounterpartyRoleType, 'supplier')) {
    return null;
  }

  return counterparty;
}

router.get('/purchase-orders', authenticateToken, requirePermission('canAccessPurchase'), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      include: {
        counterparty: true,
        item: true,
        currency: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(orders);
  } catch (error) {
    console.error('[CRITICAL] Failed to fetch purchase orders:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to fetch purchase orders.' });
  }
});

router.post('/purchase-orders', authenticateToken, requirePermission('canAccessPurchase'), async (req: AuthenticatedRequest, res: Response) => {
  const { counterpartyId, itemId, qty, price, status, expectedDate, currencyId } = req.body;
  if (!counterpartyId || !itemId || qty === undefined || price === undefined || !currencyId) {
    return res.status(400).json({ error: '[CRITICAL] Missing required purchase order fields.' });
  }

  const parsedQty = parseInt(qty, 10);
  const parsedPrice = parseFloat(price);
  if (Number.isNaN(parsedQty) || parsedQty <= 0) {
    return res.status(400).json({ error: '[CRITICAL] Quantity must be a positive integer.' });
  }
  if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({ error: '[CRITICAL] Price cannot be negative.' });
  }

  try {
    const supplier = await findSupplierCounterparty(counterpartyId);
    if (!supplier) {
      return res.status(400).json({ error: '[CRITICAL] Selected counterparty is not supplier-capable.' });
    }

    const orders = await prisma.purchaseOrder.findMany({ select: { orderNo: true } });
    const nextNum = orders.reduce((highest, order) => {
      const match = /^PO-(\d+)$/.exec(order.orderNo);
      return match ? Math.max(highest, Number.parseInt(match[1], 10)) : highest;
    }, 0) + 1;
    const generatedOrderNo = `PO-${String(nextNum).padStart(3, '0')}`;
    const totalPrice = parsedQty * parsedPrice;

    const newOrder = await prisma.purchaseOrder.create({
      data: {
        orderNo: generatedOrderNo,
        counterpartyId,
        itemId,
        qty: parsedQty,
        price: parsedPrice,
        totalPrice,
        currencyId,
        status: status || 'DRAFT',
        expectedDate: expectedDate ? new Date(expectedDate) : null,
      },
      include: {
        counterparty: true,
        item: true,
        currency: true,
      },
    });
    return res.json(newOrder);
  } catch (error) {
    console.error('[CRITICAL] Failed to create purchase order:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to create purchase order.' });
  }
});

router.put('/purchase-orders/:id', authenticateToken, requirePermission('canAccessPurchase'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { counterpartyId, itemId, qty, price, status, expectedDate, currencyId } = req.body;
  if (!counterpartyId || !itemId || qty === undefined || price === undefined || !status || !currencyId) {
    return res.status(400).json({ error: '[CRITICAL] Missing required purchase order fields.' });
  }

  const parsedQty = parseInt(qty, 10);
  const parsedPrice = parseFloat(price);
  if (Number.isNaN(parsedQty) || parsedQty <= 0) {
    return res.status(400).json({ error: '[CRITICAL] Quantity must be a positive integer.' });
  }
  if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({ error: '[CRITICAL] Price cannot be negative.' });
  }

  try {
    const supplier = await findSupplierCounterparty(counterpartyId);
    if (!supplier) {
      return res.status(400).json({ error: '[CRITICAL] Selected counterparty is not supplier-capable.' });
    }

    const existingOrder = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existingOrder) {
      return res.status(404).json({ error: '[CRITICAL] Purchase order not found.' });
    }

    const totalPrice = parsedQty * parsedPrice;
    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        counterpartyId,
        itemId,
        qty: parsedQty,
        price: parsedPrice,
        totalPrice,
        currencyId,
        status,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
      },
      include: {
        counterparty: true,
        item: true,
        currency: true,
      },
    });
    return res.json(updated);
  } catch (error) {
    console.error('[CRITICAL] Failed to update purchase order:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to update purchase order.' });
  }
});

router.delete('/purchase-orders/:id', authenticateToken, requirePermission('canAccessPurchase'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.purchaseOrder.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error('[CRITICAL] Failed to delete purchase order:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to delete purchase order.' });
  }
});

router.post('/purchase-orders/:id/receive', authenticateToken, requirePermission('canAccessPurchase'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { receiveQty, warehouseId } = req.body;
  const userId = req.user?.id;

  if (!receiveQty || !warehouseId || !userId) {
    return res.status(400).json({ error: '[CRITICAL] Missing receive quantity, warehouse, or user.' });
  }

  const parsedReceiveQty = parseInt(receiveQty, 10);
  if (Number.isNaN(parsedReceiveQty) || parsedReceiveQty <= 0) {
    return res.status(400).json({ error: '[CRITICAL] Receive quantity must be a positive integer.' });
  }

  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { item: true, counterparty: true, currency: true },
    });

    if (!order) {
      return res.status(404).json({ error: '[CRITICAL] Purchase order not found.' });
    }

    const remainingQty = order.qty - order.receivedQty;
    if (parsedReceiveQty > remainingQty) {
      return res.status(400).json({ error: `[CRITICAL] Receive quantity cannot exceed remaining quantity: ${remainingQty}` });
    }

    const newReceivedQty = order.receivedQty + parsedReceiveQty;
    const newStatus = newReceivedQty >= order.qty ? 'RECEIVED' : order.status;

    await prisma.purchaseOrder.update({
      where: { id },
      data: {
        receivedQty: newReceivedQty,
        status: newStatus,
      },
    });

    await prisma.goodsMove.create({
      data: {
        itemId: order.itemId,
        qty: parsedReceiveQty,
        type: 'IN',
        toWarehouseId: warehouseId,
        userId,
        remarks: `Purchase order ${order.orderNo} received from supplier: ${order.counterparty.name}`,
      },
    });

    const updated = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        counterparty: true,
        item: true,
        currency: true,
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error('[CRITICAL] Failed to receive purchase order:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to receive purchase order.' });
  }
});

export default router;
