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

router.get('/sales-orders', authenticateToken, requirePermission('canAccessSales'), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = await prisma.salesOrder.findMany({
      include: {
        counterparty: true,
        item: true,
        currency: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(orders);
  } catch (error) {
    console.error('[CRITICAL] Failed to fetch sales orders:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to fetch sales orders.' });
  }
});

router.post('/sales-orders', authenticateToken, requirePermission('canAccessSales'), async (req: AuthenticatedRequest, res: Response) => {
  const { counterpartyId, itemId, qty, price, status, currencyId } = req.body;
  if (!counterpartyId || !itemId || qty === undefined || price === undefined || !currencyId) {
    return res.status(400).json({ error: '[CRITICAL] Missing required sales order fields.' });
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
    const customer = await findCustomerCounterparty(counterpartyId);
    if (!customer) {
      return res.status(400).json({ error: '[CRITICAL] Selected counterparty is not customer-capable.' });
    }

    const orders = await prisma.salesOrder.findMany({ select: { orderNo: true } });
    const nextNum = orders.reduce((highest, order) => {
      const match = /^SO-(\d+)$/.exec(order.orderNo);
      return match ? Math.max(highest, Number.parseInt(match[1], 10)) : highest;
    }, 0) + 1;
    const generatedOrderNo = `SO-${String(nextNum).padStart(3, '0')}`;
    const totalPrice = parsedQty * parsedPrice;

    const newOrder = await prisma.salesOrder.create({
      data: {
        orderNo: generatedOrderNo,
        counterpartyId,
        itemId,
        qty: parsedQty,
        price: parsedPrice,
        totalPrice,
        currencyId,
        status: status || 'DRAFT',
      },
      include: {
        counterparty: true,
        item: true,
        currency: true,
      },
    });
    return res.json(newOrder);
  } catch (error) {
    console.error('[CRITICAL] Failed to create sales order:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to create sales order.' });
  }
});

router.put('/sales-orders/:id', authenticateToken, requirePermission('canAccessSales'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { counterpartyId, itemId, qty, price, status, currencyId } = req.body;
  if (!counterpartyId || !itemId || qty === undefined || price === undefined || !status || !currencyId) {
    return res.status(400).json({ error: '[CRITICAL] Missing required sales order fields.' });
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
    const customer = await findCustomerCounterparty(counterpartyId);
    if (!customer) {
      return res.status(400).json({ error: '[CRITICAL] Selected counterparty is not customer-capable.' });
    }

    const existingOrder = await prisma.salesOrder.findUnique({ where: { id } });
    if (!existingOrder) {
      return res.status(404).json({ error: '[CRITICAL] Sales order not found.' });
    }
    if (existingOrder.status === 'CLOSED') {
      return res.status(400).json({ error: '[CRITICAL] Closed sales orders cannot be modified.' });
    }

    const totalPrice = parsedQty * parsedPrice;
    const updated = await prisma.salesOrder.update({
      where: { id },
      data: {
        counterpartyId,
        itemId,
        qty: parsedQty,
        price: parsedPrice,
        totalPrice,
        currencyId,
        status,
      },
      include: {
        counterparty: true,
        item: true,
        currency: true,
      },
    });
    return res.json(updated);
  } catch (error) {
    console.error('[CRITICAL] Failed to update sales order:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to update sales order.' });
  }
});

router.delete('/sales-orders/:id', authenticateToken, requirePermission('canAccessSales'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const existingOrder = await prisma.salesOrder.findUnique({ where: { id } });
    if (!existingOrder) {
      return res.status(404).json({ error: '[CRITICAL] Sales order not found.' });
    }
    if (existingOrder.status === 'CLOSED') {
      return res.status(400).json({ error: '[CRITICAL] Closed sales orders cannot be deleted.' });
    }

    await prisma.salesOrder.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error('[CRITICAL] Failed to delete sales order:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to delete sales order.' });
  }
});

router.post('/sales-orders/:id/create-bill', authenticateToken, requirePermission('canAccessSales'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: { counterparty: true, currency: true },
    });

    if (!order) {
      return res.status(404).json({ error: '[CRITICAL] Sales order not found.' });
    }
    if (order.status === 'CLOSED') {
      return res.status(400).json({ error: '[CRITICAL] Sales order already created a finance bill.' });
    }

    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const newBill = await prisma.financialBill.create({
      data: {
        type: 'RECEIVABLE',
        amount: order.totalPrice,
        currencyId: order.currencyId,
        paidAmount: 0.0,
        status: 'UNPAID',
        counterpartyId: order.counterpartyId,
        counterpartyNameSnapshot: order.counterparty.name,
        sourceType: 'SALES_ORDER',
        sourceId: order.id,
        description: `Generated from sales order ${order.orderNo}`,
        dueDate,
      },
    });

    const updatedOrder = await prisma.salesOrder.update({
      where: { id },
      data: { status: 'CLOSED' },
      include: { counterparty: true, item: true, currency: true },
    });

    return res.json({
      success: true,
      bill: newBill,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('[CRITICAL] Failed to create bill from sales order:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to create bill from sales order.' });
  }
});

export default router;
