import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

// ---------------------- 物料主数据 ----------------------
router.get('/items', authenticateToken, requirePermission('canAccessGoods'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const items = await prisma.item.findMany({
      include: { currency: true },
      orderBy: { code: 'asc' },
    });
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 无法拉取物料编码列表。' });
  }
});

router.post('/items', authenticateToken, requirePermission('canAccessGoods'), async (req: AuthenticatedRequest, res: Response) => {
  const { name, unit, description, cost, currencyId, type } = req.body;
  if (!name || !currencyId) {
    return res.status(400).json({ error: '[CRITICAL] 物料名称和货币代码不可为空。' });
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

    let parsedCost = 0;
    if (typeof cost === 'number') parsedCost = cost;
    else if (typeof cost === 'string') {
      const n = parseFloat(cost);
      if (!Number.isNaN(n)) parsedCost = n;
    }

    const newItem = await prisma.item.create({
      data: {
        code: generatedCode,
        name,
        unit: unit || '件',
        description,
        type: type || 'MATERIAL',
        cost: parsedCost,
        currencyId,
      },
    });
    return res.json(newItem);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 自动生成编码并创建产品失败。' });
  }
});

router.put('/items/:id', authenticateToken, requirePermission('canAccessGoods'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { code, name, unit, description, cost, currencyId } = req.body;
  try {
    const data: any = { code, name, unit, description };
    if (currencyId) data.currencyId = currencyId;

    if (cost !== undefined) {
      let parsedCost = 0;
      if (typeof cost === 'number') parsedCost = cost;
      else if (typeof cost === 'string') {
        const n = parseFloat(cost);
        if (!Number.isNaN(n)) parsedCost = n;
      }
      data.cost = parsedCost;
    }

    const updated = await prisma.item.update({
      where: { id },
      data,
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
    console.error('[CRITICAL] 删除 BOM 物料失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 删除 BOM 物料失败。' });
  }
});

export default router;
