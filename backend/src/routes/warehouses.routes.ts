import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

router.get('/', authenticateToken, requirePermission('canAccessWarehouse'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return res.json(warehouses);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 无法拉取仓库列表。' });
  }
});

router.post('/', authenticateToken, requirePermission('canAccessWarehouse'), async (req: AuthenticatedRequest, res: Response) => {
  const { name, location, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: '[CRITICAL] 仓库名称不可为空。' });
  }
  try {
    const newWarehouse = await prisma.warehouse.create({
      data: { name, location, description },
    });
    return res.json(newWarehouse);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 仓库名称已存在或创建失败。' });
  }
});

router.put('/:id', authenticateToken, requirePermission('canAccessWarehouse'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, location, description } = req.body;
  try {
    const updated = await prisma.warehouse.update({
      where: { id },
      data: { name, location, description },
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 更新仓库信息失败。' });
  }
});

router.delete('/:id', authenticateToken, requirePermission('canAccessWarehouse'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.warehouse.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 该仓库有关联流转记录，无法删除。' });
  }
});

export default router;
