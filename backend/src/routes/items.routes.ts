import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

// ---------------------- 物料主数据 ----------------------
router.get('/items', authenticateToken, requirePermission('canAccessGoods'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const items = await prisma.item.findMany({
      orderBy: { code: 'asc' },
    });
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 无法拉取物料编码列表。' });
  }
});

router.post('/items', authenticateToken, requirePermission('canAccessGoods'), async (req: AuthenticatedRequest, res: Response) => {
  const { name, unit, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: '[CRITICAL] 物料名称不可为空。' });
  }
  try {
    const items = await prisma.item.findMany({
      select: { code: true }
    });

    let nextNum = 1;
    const regex = /^ITEM-(\d+)$/;
    items.forEach(it => {
      const match = it.code.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNum) {
          nextNum = num + 1;
        }
      }
    });

    const paddedNum = String(nextNum).padStart(3, '0');
    const generatedCode = `ITEM-${paddedNum}`;

    const newItem = await prisma.item.create({
      data: {
        code: generatedCode,
        name,
        unit: unit || '件',
        description
      },
    });
    return res.json(newItem);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 自动生成编码并创建产品失败。' });
  }
});

router.put('/items/:id', authenticateToken, requirePermission('canAccessGoods'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { code, name, unit, description } = req.body;
  try {
    const updated = await prisma.item.update({
      where: { id },
      data: { code, name, unit, description }
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 更新物料失败。' });
  }
});

router.delete('/items/:id', authenticateToken, requirePermission('canAccessGoods'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.item.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 该物料已有关联流转记录，无法删除。' });
  }
});

// ---------------------- BOM 配置 API ----------------------
router.get('/bom', authenticateToken, requirePermission('canAccessAssembly'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const items = await prisma.item.findMany({
      where: {
        type: 'PRODUCT',
        bomComponents: {
          some: {}
        }
      },
      include: {
        bomComponents: {
          include: {
            componentItem: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(items);
  } catch (error) {
    console.error('[CRITICAL] 获取 BOM 列表失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 获取 BOM 列表失败。' });
  }
});

router.get('/bom/:itemId', authenticateToken, requirePermission('canAccessAssembly'), async (req: AuthenticatedRequest, res: Response) => {
  const { itemId } = req.params;
  try {
    const bom = await prisma.bomComponent.findMany({
      where: { parentItemId: itemId },
      include: {
        componentItem: true
      },
      orderBy: { createdAt: 'asc' }
    });
    return res.json(bom);
  } catch (error) {
    console.error('[CRITICAL] 获取 BOM 清单失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 获取 BOM 清单失败。' });
  }
});

router.post('/bom', authenticateToken, requirePermission('canAccessAssembly'), async (req: AuthenticatedRequest, res: Response) => {
  const { parentItemId, components } = req.body;
  
  if (!parentItemId || !Array.isArray(components)) {
    return res.status(400).json({ error: '[CRITICAL] 缺少必要参数。' });
  }

  try {
    const parentItem = await prisma.item.findUnique({ where: { id: parentItemId } });
    if (!parentItem) {
      return res.status(404).json({ error: '[CRITICAL] 成品不存在。' });
    }
    if (parentItem.type !== 'PRODUCT') {
      return res.status(400).json({ error: '[CRITICAL] 只能为成品类型的物料配置 BOM。' });
    }

    await prisma.bomComponent.deleteMany({
      where: { parentItemId }
    });

    if (components.length > 0) {
      await prisma.bomComponent.createMany({
        data: components.map((c: any) => ({
          parentItemId,
          componentItemId: c.componentItemId,
          quantity: parseInt(c.quantity),
          remarks: c.remarks || null
        }))
      });
    }

    const newBom = await prisma.bomComponent.findMany({
      where: { parentItemId },
      include: {
        componentItem: true
      }
    });

    return res.json(newBom);
  } catch (error) {
    console.error('[CRITICAL] 保存 BOM 配置失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 保存 BOM 配置失败。' });
  }
});

router.delete('/bom/:parentId/:componentId', authenticateToken, requirePermission('canAccessAssembly'), async (req: AuthenticatedRequest, res: Response) => {
  const { parentId, componentId } = req.params;
  try {
    await prisma.bomComponent.delete({
      where: {
        parentItemId_componentItemId: {
          parentItemId: parentId,
          componentItemId: componentId
        }
      }
    });
    return res.json({ success: true });
  } catch (error) {
    console.error('[CRITICAL] 删除 BOM 零件失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 删除 BOM 零件失败。' });
  }
});

// ---------------------- 组装操作 API ----------------------
router.post('/assembly/check', authenticateToken, requirePermission('canAccessAssembly'), async (req: AuthenticatedRequest, res: Response) => {
  const { assembledItemId, quantity, warehouseId } = req.body;

  if (!assembledItemId || !quantity || !warehouseId) {
    return res.status(400).json({ error: '[CRITICAL] 缺少必要参数。' });
  }

  try {
    const bom = await prisma.bomComponent.findMany({
      where: { parentItemId: assembledItemId },
      include: {
        componentItem: true
      }
    });

    if (bom.length === 0) {
      return res.status(400).json({ error: '[CRITICAL] 该成品未配置 BOM 清单，无法组装。' });
    }

    const stockCheck = [];
    for (const component of bom) {
      const requiredQty = component.quantity * parseInt(quantity);
      
      const moves = await prisma.goodsMove.findMany({
        where: {
          itemId: component.componentItemId,
          OR: [
            { fromWarehouseId: warehouseId },
            { toWarehouseId: warehouseId }
          ]
        }
      });

      let stock = 0;
      for (const m of moves) {
        if (m.toWarehouseId === warehouseId) stock += m.qty;
        if (m.fromWarehouseId === warehouseId) stock -= m.qty;
      }

      stockCheck.push({
        componentItem: component.componentItem,
        requiredQty,
        currentStock: stock,
        sufficient: stock >= requiredQty
      });
    }

    const allSufficient = stockCheck.every(c => c.sufficient);

    return res.json({
      canAssemble: allSufficient,
      stockCheck
    });
  } catch (error) {
    console.error('[CRITICAL] 库存检查失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 库存检查失败。' });
  }
});

router.post('/assembly/assemble', authenticateToken, requirePermission('canAccessAssembly'), async (req: AuthenticatedRequest, res: Response) => {
  const { assembledItemId, quantity, warehouseId, remarks } = req.body;
  const userId = req.user?.id;

  if (!assembledItemId || !quantity || !warehouseId || !userId) {
    return res.status(400).json({ error: '[CRITICAL] 缺少必要参数。' });
  }

  try {
    const bom = await prisma.bomComponent.findMany({
      where: { parentItemId: assembledItemId },
      include: {
        componentItem: true
      }
    });

    if (bom.length === 0) {
      return res.status(400).json({ error: '[CRITICAL] 该成品未配置 BOM 清单，无法组装。' });
    }

    // 库存预检
    for (const component of bom) {
      const requiredQty = component.quantity * parseInt(quantity);
      const moves = await prisma.goodsMove.findMany({
        where: {
          itemId: component.componentItemId,
          OR: [
            { fromWarehouseId: warehouseId },
            { toWarehouseId: warehouseId }
          ]
        }
      });

      let stock = 0;
      for (const m of moves) {
        if (m.toWarehouseId === warehouseId) stock += m.qty;
        if (m.fromWarehouseId === warehouseId) stock -= m.qty;
      }

      if (stock < requiredQty) {
        return res.status(400).json({ 
          error: `[CRITICAL] ${component.componentItem.name} 库存不足。需要 ${requiredQty}，库存 ${stock}。` 
        });
      }
    }

    let totalCost = 0;
    for (const component of bom) {
      totalCost += component.componentItem.cost * component.quantity * parseInt(quantity);
    }

    const result = await prisma.$transaction(async (tx) => {
      const componentMoves = [];
      for (const component of bom) {
        const move = await tx.goodsMove.create({
          data: {
            itemId: component.componentItemId,
            qty: component.quantity * parseInt(quantity),
            type: 'OUT',
            fromWarehouseId: warehouseId,
            userId,
            remarks: `组装消耗：${remarks || ''}`
          },
          include: {
            item: true
          }
        });
        componentMoves.push(move);
      }

      const productMove = await tx.goodsMove.create({
        data: {
          itemId: assembledItemId,
          qty: parseInt(quantity),
          type: 'IN',
          toWarehouseId: warehouseId,
          userId,
          remarks: `组装生产：${remarks || ''}`
        },
        include: {
          item: true
        }
      });

      const assemblyLog = await tx.assemblyLog.create({
        data: {
          type: 'ASSEMBLE',
          assembledItemId,
          quantity: parseInt(quantity),
          totalCost,
          warehouseId,
          userId,
          remarks
        },
        include: {
          assembledItem: true,
          warehouse: true,
          user: { select: { username: true } }
        }
      });

      return { assemblyLog, componentMoves, productMove };
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[CRITICAL] 组装操作失败：', error);
    return res.status(500).json({ error: error.message || '[CRITICAL] 组装操作失败。' });
  }
});

router.post('/assembly/disassemble', authenticateToken, requirePermission('canAccessAssembly'), async (req: AuthenticatedRequest, res: Response) => {
  const { assembledItemId, quantity, warehouseId, remarks } = req.body;
  const userId = req.user?.id;

  if (!assembledItemId || !quantity || !warehouseId || !userId) {
    return res.status(400).json({ error: '[CRITICAL] 缺少必要参数。' });
  }

  try {
    const bom = await prisma.bomComponent.findMany({
      where: { parentItemId: assembledItemId },
      include: {
        componentItem: true
      }
    });

    if (bom.length === 0) {
      return res.status(400).json({ error: '[CRITICAL] 该成品未配置 BOM 清单，无法拆解。' });
    }

    const moves = await prisma.goodsMove.findMany({
      where: {
        itemId: assembledItemId,
        OR: [
          { fromWarehouseId: warehouseId },
          { toWarehouseId: warehouseId }
        ]
      }
    });

    let stock = 0;
    for (const m of moves) {
      if (m.toWarehouseId === warehouseId) stock += m.qty;
      if (m.fromWarehouseId === warehouseId) stock -= m.qty;
    }

    if (stock < parseInt(quantity)) {
      return res.status(400).json({ 
        error: `[CRITICAL] 成品库存不足。需要 ${quantity}，库存 ${stock}。` 
      });
    }

    let totalCost = 0;
    for (const component of bom) {
      totalCost += component.componentItem.cost * component.quantity * parseInt(quantity);
    }

    const result = await prisma.$transaction(async (tx) => {
      const productMove = await tx.goodsMove.create({
        data: {
          itemId: assembledItemId,
          qty: parseInt(quantity),
          type: 'OUT',
          fromWarehouseId: warehouseId,
          userId,
          remarks: `拆解消耗：${remarks || ''}`
        },
        include: {
          item: true
        }
      });

      const componentMoves = [];
      for (const component of bom) {
        const move = await tx.goodsMove.create({
          data: {
            itemId: component.componentItemId,
            qty: component.quantity * parseInt(quantity),
            type: 'IN',
            toWarehouseId: warehouseId,
            userId,
            remarks: `拆解还原：${remarks || ''}`
          },
          include: {
            item: true
          }
        });
        componentMoves.push(move);
      }

      const assemblyLog = await tx.assemblyLog.create({
        data: {
          type: 'DISASSEMBLE',
          assembledItemId,
          quantity: parseInt(quantity),
          totalCost: -totalCost,
          warehouseId,
          userId,
          remarks
        },
        include: {
          assembledItem: true,
          warehouse: true,
          user: { select: { username: true } }
        }
      });

      return { assemblyLog, componentMoves, productMove };
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[CRITICAL] 拆解操作失败：', error);
    return res.status(500).json({ error: error.message || '[CRITICAL] 拆解操作失败。' });
  }
});

router.get('/assembly/logs', authenticateToken, requirePermission('canAccessAssembly'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await prisma.assemblyLog.findMany({
      include: {
        assembledItem: true,
        warehouse: true,
        user: { select: { username: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    return res.json(logs);
  } catch (error) {
    console.error('[CRITICAL] 获取组装历史失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 获取组装历史失败。' });
  }
});

export default router;
