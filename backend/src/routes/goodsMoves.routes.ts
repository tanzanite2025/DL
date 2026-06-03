import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

router.get('/', authenticateToken, requirePermission('canAccessGoods'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const moves = await prisma.goodsMove.findMany({
      include: {
        item: true,
        fromWarehouse: true,
        toWarehouse: true,
        user: { select: { username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(moves);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 无法拉取货物流转记录。' });
  }
});

router.post('/', authenticateToken, requirePermission('canAccessGoods'), async (req: AuthenticatedRequest, res: Response) => {
  const { itemId, qty, type, fromWarehouseId, toWarehouseId, remarks } = req.body;
  const userId = req.user?.id;

  if (!itemId || !qty || !type || !userId) {
    return res.status(400).json({ error: '[CRITICAL] 流转操作缺少核心参数（物料、数量、类型）。' });
  }

  if (type === 'OUT' && !fromWarehouseId) {
    return res.status(400).json({ error: '[CRITICAL] 出库操作必须指定源仓库。' });
  }
  if (type === 'IN' && !toWarehouseId) {
    return res.status(400).json({ error: '[CRITICAL] 入库操作必须指定目标仓库。' });
  }
  if (type === 'TRANSFER' && (!fromWarehouseId || !toWarehouseId)) {
    return res.status(400).json({ error: '[CRITICAL] 调拨操作必须同时指定源仓库和目标仓库。' });
  }

  try {
    if (type === 'OUT' || type === 'TRANSFER') {
      const moves = await prisma.goodsMove.findMany({
        where: {
          itemId,
          OR: [
            { fromWarehouseId: fromWarehouseId },
            { toWarehouseId: fromWarehouseId }
          ]
        }
      });
      let stock = 0;
      for (const m of moves) {
        if (m.toWarehouseId === fromWarehouseId) stock += m.qty;
        if (m.fromWarehouseId === fromWarehouseId) stock -= m.qty;
      }
      if (stock < qty) {
        return res.status(400).json({ error: `[CRITICAL] 源仓库库存不足。当前库存为 ${stock}。` });
      }
    }

    const newMove = await prisma.goodsMove.create({
      data: {
        itemId,
        qty: parseInt(qty),
        type,
        fromWarehouseId: fromWarehouseId || null,
        toWarehouseId: toWarehouseId || null,
        userId,
        remarks,
      },
      include: {
        item: true,
        fromWarehouse: true,
        toWarehouse: true,
        user: { select: { username: true } },
      },
    });

    return res.json(newMove);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: '[CRITICAL] 执行货物流转登记失败。' });
  }
});

router.delete('/:id', authenticateToken, requirePermission('canAccessGoods'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const move = await prisma.goodsMove.findUnique({ where: { id } });
    if (!move) {
      return res.status(404).json({ error: '[CRITICAL] 未找到对应流转记录。' });
    }
    await prisma.goodsMove.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 删除流转记录失败。' });
  }
});

export default router;
