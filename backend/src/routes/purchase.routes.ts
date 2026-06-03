import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

// 供应商管理
router.get('/suppliers', authenticateToken, requirePermission('canAccessPurchase'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json(suppliers);
  } catch (error) {
    console.error('[CRITICAL] 无法拉取供应商列表：', error);
    return res.status(500).json({ error: '[CRITICAL] 无法拉取供应商列表。' });
  }
});

router.post('/suppliers', authenticateToken, requirePermission('canAccessPurchase'), async (req: AuthenticatedRequest, res: Response) => {
  const { name, contactPerson, phone, email, address, remarks } = req.body;
  if (!name) {
    return res.status(400).json({ error: '[CRITICAL] 供应商名称不可为空。' });
  }
  try {
    const existing = await prisma.supplier.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: '[CRITICAL] 该供应商名称已存在。' });
    }

    const suppliers = await prisma.supplier.findMany({
      select: { code: true }
    });

    let nextNum = 1;
    const regex = /^SUPP-(\d+)$/;
    suppliers.forEach(s => {
      const match = s.code.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNum) {
          nextNum = num + 1;
        }
      }
    });

    const paddedNum = String(nextNum).padStart(3, '0');
    const generatedCode = `SUPP-${paddedNum}`;

    const newSupplier = await prisma.supplier.create({
      data: {
        code: generatedCode,
        name,
        contactPerson,
        phone,
        email,
        address,
        remarks,
      },
    });
    return res.json(newSupplier);
  } catch (error) {
    console.error('[CRITICAL] 登记供应商失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 登记供应商失败。' });
  }
});

router.put('/suppliers/:id', authenticateToken, requirePermission('canAccessPurchase'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, contactPerson, phone, email, address, remarks } = req.body;
  if (!name) {
    return res.status(400).json({ error: '[CRITICAL] 供应商名称不可为空。' });
  }
  try {
    const existing = await prisma.supplier.findFirst({
      where: {
        name,
        NOT: { id }
      }
    });
    if (existing) {
      return res.status(400).json({ error: '[CRITICAL] 该供应商名称已被其他供应商占用。' });
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: { name, contactPerson, phone, email, address, remarks },
    });
    return res.json(updated);
  } catch (error) {
    console.error('[CRITICAL] 更新供应商失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 更新供应商失败。' });
  }
});

router.delete('/suppliers/:id', authenticateToken, requirePermission('canAccessPurchase'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const orderCount = await prisma.purchaseOrder.count({
      where: { supplierId: id }
    });
    if (orderCount > 0) {
      return res.status(400).json({ error: '[CRITICAL] 该供应商有关联采购订单，无法删除。' });
    }

    await prisma.supplier.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error('[CRITICAL] 删除供应商失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 删除供应商失败。' });
  }
});

// 采购订单
router.get('/purchase-orders', authenticateToken, requirePermission('canAccessPurchase'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        item: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(orders);
  } catch (error) {
    console.error('[CRITICAL] 无法拉取采购订单：', error);
    return res.status(500).json({ error: '[CRITICAL] 无法拉取采购订单。' });
  }
});

router.post('/purchase-orders', authenticateToken, requirePermission('canAccessPurchase'), async (req: AuthenticatedRequest, res: Response) => {
  const { supplierId, itemId, qty, price, status, expectedDate } = req.body;
  if (!supplierId || !itemId || qty === undefined || price === undefined) {
    return res.status(400).json({ error: '[CRITICAL] 采购订单录入缺少核心字段（供应商、物料、数量、单价）。' });
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
    const orders = await prisma.purchaseOrder.findMany({
      select: { orderNo: true }
    });

    let nextNum = 1;
    const regex = /^PO-(\d+)$/;
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
    const generatedOrderNo = `PO-${paddedNum}`;
    const totalPrice = parsedQty * parsedPrice;

    const newOrder = await prisma.purchaseOrder.create({
      data: {
        orderNo: generatedOrderNo,
        supplierId,
        itemId,
        qty: parsedQty,
        price: parsedPrice,
        totalPrice,
        status: status || 'DRAFT',
        expectedDate: expectedDate ? new Date(expectedDate) : null,
      },
      include: {
        supplier: true,
        item: true,
      }
    });
    return res.json(newOrder);
  } catch (error) {
    console.error('[CRITICAL] 录入采购订单失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 录入采购订单失败。' });
  }
});

router.put('/purchase-orders/:id', authenticateToken, requirePermission('canAccessPurchase'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { supplierId, itemId, qty, price, status, expectedDate } = req.body;
  if (!supplierId || !itemId || qty === undefined || price === undefined || !status) {
    return res.status(400).json({ error: '[CRITICAL] 更新采购订单缺少核心字段（供应商、物料、数量、单价、状态）。' });
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
    const existingOrder = await prisma.purchaseOrder.findUnique({
      where: { id }
    });
    if (!existingOrder) {
      return res.status(404).json({ error: '[CRITICAL] 未找到该采购订单。' });
    }

    const totalPrice = parsedQty * parsedPrice;
    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        supplierId,
        itemId,
        qty: parsedQty,
        price: parsedPrice,
        totalPrice,
        status,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
      },
      include: {
        supplier: true,
        item: true,
      }
    });
    return res.json(updated);
  } catch (error) {
    console.error('[CRITICAL] 更新采购订单失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 更新采购订单失败。' });
  }
});

router.delete('/purchase-orders/:id', authenticateToken, requirePermission('canAccessPurchase'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.purchaseOrder.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error('[CRITICAL] 删除采购订单失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 删除采购订单失败。' });
  }
});

// 采购订单收货登记
router.post('/purchase-orders/:id/receive', authenticateToken, requirePermission('canAccessPurchase'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { receiveQty, warehouseId } = req.body;
  const userId = req.user?.id;

  if (!receiveQty || !warehouseId || !userId) {
    return res.status(400).json({ error: '[CRITICAL] 收货登记缺少核心参数（收货数量、目标仓库）。' });
  }

  const parsedReceiveQty = parseInt(receiveQty);
  if (isNaN(parsedReceiveQty) || parsedReceiveQty <= 0) {
    return res.status(400).json({ error: '[CRITICAL] 收货数量必须是大于零的整数。' });
  }

  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { item: true, supplier: true }
    });

    if (!order) {
      return res.status(404).json({ error: '[CRITICAL] 未找到该采购订单。' });
    }

    const remainingQty = order.qty - order.receivedQty;
    if (parsedReceiveQty > remainingQty) {
      return res.status(400).json({ error: `[CRITICAL] 收货数量不能超过未收货数量。未收货数量: ${remainingQty}` });
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
        remarks: `采购订单 ${order.orderNo} 收货入库 - 供应商: ${order.supplier.name}`,
      },
    });

    const updated = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        item: true,
      }
    });

    return res.json(updated);
  } catch (error) {
    console.error('[CRITICAL] 采购收货登记失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 采购收货登记失败。' });
  }
});

export default router;
