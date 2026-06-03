import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

// 客户管理
router.get('/customers', authenticateToken, requirePermission('canAccessSales'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json(customers);
  } catch (error) {
    console.error('[CRITICAL] 无法拉取客户列表：', error);
    return res.status(500).json({ error: '[CRITICAL] 无法拉取客户列表。' });
  }
});

router.post('/customers', authenticateToken, requirePermission('canAccessSales'), async (req: AuthenticatedRequest, res: Response) => {
  const { name, phone, email, address } = req.body;
  if (!name) {
    return res.status(400).json({ error: '[CRITICAL] 客户名称不可为空。' });
  }
  try {
    const existing = await prisma.customer.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: '[CRITICAL] 该客户名称已存在。' });
    }

    const customers = await prisma.customer.findMany({
      select: { code: true }
    });

    let nextNum = 1;
    const regex = /^CUST-(\d+)$/;
    customers.forEach(c => {
      const match = c.code.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNum) {
          nextNum = num + 1;
        }
      }
    });

    const paddedNum = String(nextNum).padStart(3, '0');
    const generatedCode = `CUST-${paddedNum}`;

    const newCustomer = await prisma.customer.create({
      data: {
        code: generatedCode,
        name,
        phone,
        email,
        address,
      },
    });
    return res.json(newCustomer);
  } catch (error) {
    console.error('[CRITICAL] 登记客户失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 登记客户失败。' });
  }
});

router.put('/customers/:id', authenticateToken, requirePermission('canAccessSales'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, phone, email, address } = req.body;
  if (!name) {
    return res.status(400).json({ error: '[CRITICAL] 客户名称不可为空。' });
  }
  try {
    const existing = await prisma.customer.findFirst({
      where: {
        name,
        NOT: { id }
      }
    });
    if (existing) {
      return res.status(400).json({ error: '[CRITICAL] 该客户名称已被其他客户占用。' });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: { name, phone, email, address },
    });
    return res.json(updated);
  } catch (error) {
    console.error('[CRITICAL] 更新客户失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 更新客户失败。' });
  }
});

router.delete('/customers/:id', authenticateToken, requirePermission('canAccessSales'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const orderCount = await prisma.salesOrder.count({
      where: { customerId: id }
    });
    if (orderCount > 0) {
      return res.status(400).json({ error: '[CRITICAL] 该客户有关联销售订单，无法删除。' });
    }

    await prisma.customer.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error('[CRITICAL] 删除客户失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 删除客户失败。' });
  }
});

// 销售订单
router.get('/sales-orders', authenticateToken, requirePermission('canAccessSales'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = await prisma.salesOrder.findMany({
      include: {
        customer: true,
        item: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(orders);
  } catch (error) {
    console.error('[CRITICAL] 无法拉取销售订单：', error);
    return res.status(500).json({ error: '[CRITICAL] 无法拉取销售订单。' });
  }
});

router.post('/sales-orders', authenticateToken, requirePermission('canAccessSales'), async (req: AuthenticatedRequest, res: Response) => {
  const { customerId, itemId, qty, price, status } = req.body;
  if (!customerId || !itemId || qty === undefined || price === undefined) {
    return res.status(400).json({ error: '[CRITICAL] 销售订单录入缺少核心字段（客户、物料、数量、单价）。' });
  }
  const parsedQty = parseInt(qty);
  const parsedPrice = parseFloat(price);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    return res.status(400).json({ error: '[CRITICAL] 数量必须是大于零的整数。' });
  }
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({ error: '[CRITICAL] 单价不能小于零。' });
  }

  try {
    const orders = await prisma.salesOrder.findMany({
      select: { orderNo: true }
    });

    let nextNum = 1;
    const regex = /^SO-(\d+)$/;
    orders.forEach(o => {
      const match = o.orderNo.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNum) {
          nextNum = num + 1;
        }
      }
    });

    const paddedNum = String(nextNum).padStart(3, '0');
    const generatedOrderNo = `SO-${paddedNum}`;
    const totalPrice = parsedQty * parsedPrice;

    const newOrder = await prisma.salesOrder.create({
      data: {
        orderNo: generatedOrderNo,
        customerId,
        itemId,
        qty: parsedQty,
        price: parsedPrice,
        totalPrice,
        status: status || 'DRAFT',
      },
      include: {
        customer: true,
        item: true,
      }
    });
    return res.json(newOrder);
  } catch (error) {
    console.error('[CRITICAL] 录入销售订单失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 录入销售订单失败。' });
  }
});

router.put('/sales-orders/:id', authenticateToken, requirePermission('canAccessSales'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { customerId, itemId, qty, price, status } = req.body;
  if (!customerId || !itemId || qty === undefined || price === undefined || !status) {
    return res.status(400).json({ error: '[CRITICAL] 更新销售订单缺少核心字段（客户、物料、数量、单价、状态）。' });
  }
  const parsedQty = parseInt(qty);
  const parsedPrice = parseFloat(price);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    return res.status(400).json({ error: '[CRITICAL] 数量必须是大于零的整数。' });
  }
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({ error: '[CRITICAL] 单价不能小于零。' });
  }

  try {
    const existingOrder = await prisma.salesOrder.findUnique({
      where: { id }
    });
    if (!existingOrder) {
      return res.status(404).json({ error: '[CRITICAL] 未找到该销售订单。' });
    }

    if (existingOrder.status === 'CLOSED') {
      return res.status(400).json({ error: '[CRITICAL] 该销售订单已生成财务账单，状态为 CLOSED，不可修改。' });
    }

    const totalPrice = parsedQty * parsedPrice;
    const updated = await prisma.salesOrder.update({
      where: { id },
      data: {
        customerId,
        itemId,
        qty: parsedQty,
        price: parsedPrice,
        totalPrice,
        status,
      },
      include: {
        customer: true,
        item: true,
      }
    });
    return res.json(updated);
  } catch (error) {
    console.error('[CRITICAL] 更新销售订单失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 更新销售订单失败。' });
  }
});

router.delete('/sales-orders/:id', authenticateToken, requirePermission('canAccessSales'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const existingOrder = await prisma.salesOrder.findUnique({
      where: { id }
    });
    if (!existingOrder) {
      return res.status(404).json({ error: '[CRITICAL] 未找到该销售订单。' });
    }
    if (existingOrder.status === 'CLOSED') {
      return res.status(400).json({ error: '[CRITICAL] 该销售订单已完成并生成财务账单，不可删除。' });
    }

    await prisma.salesOrder.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error('[CRITICAL] 删除销售订单失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 删除销售订单失败。' });
  }
});

router.post('/sales-orders/:id/create-bill', authenticateToken, requirePermission('canAccessSales'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: { customer: true }
    });

    if (!order) {
      return res.status(404).json({ error: '[CRITICAL] 找不到该销售订单。' });
    }

    if (order.status === 'CLOSED') {
      return res.status(400).json({ error: '[CRITICAL] 该销售订单已经生成过财务账单，无法重复操作。' });
    }

    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const newBill = await prisma.financialBill.create({
      data: {
        type: 'RECEIVABLE',
        amount: order.totalPrice,
        paidAmount: 0.0,
        status: 'UNPAID',
        partner: order.customer.name,
        description: `由销售单 ${order.orderNo} 自动生成`,
        dueDate,
      }
    });

    const updatedOrder = await prisma.salesOrder.update({
      where: { id },
      data: { status: 'CLOSED' },
      include: { customer: true, item: true }
    });

    return res.json({
      success: true,
      bill: newBill,
      order: updatedOrder
    });
  } catch (error) {
    console.error('[CRITICAL] 销售单生成财务账单联动失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 销售单生成财务账单联动失败。' });
  }
});

export default router;
