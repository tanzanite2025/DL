import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

// 全局单位主数据：仅允许有仓库/物料权限的人维护
router.get('/', authenticateToken, requirePermission('canAccessGoods'), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const units = await (prisma as any).unit.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json(units);
  } catch (error) {
    console.error('[CRITICAL] 获取单位列表失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 获取单位列表失败。' });
  }
});

router.post('/', authenticateToken, requirePermission('canAccessGoods'), async (req: AuthenticatedRequest, res: Response) => {
  const { code, name } = req.body;
  if (!code || !name) {
    return res.status(400).json({ error: '[CRITICAL] 单位代码和名称均不可为空。' });
  }

  try {
    const newUnit = await (prisma as any).unit.create({
      data: { code, name },
    });
    return res.json(newUnit);
  } catch (error: any) {
    console.error('[CRITICAL] 创建单位失败：', error);
    return res.status(500).json({ error: error.message || '[CRITICAL] 创建单位失败。' });
  }
});

router.put('/:id', authenticateToken, requirePermission('canAccessGoods'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { code, name } = req.body;

  if (!code || !name) {
    return res.status(400).json({ error: '[CRITICAL] 单位代码和名称均不可为空。' });
  }

  try {
    const updated = await (prisma as any).unit.update({
      where: { id },
      data: { code, name },
    });
    return res.json(updated);
  } catch (error: any) {
    console.error('[CRITICAL] 更新单位失败：', error);
    return res.status(500).json({ error: error.message || '[CRITICAL] 更新单位失败。' });
  }
});

router.delete('/:id', authenticateToken, requirePermission('canAccessGoods'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await (prisma as any).unit.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error: any) {
    console.error('[CRITICAL] 删除单位失败：', error);
    return res.status(500).json({ error: error.message || '[CRITICAL] 删除单位失败。' });
  }
});

export default router;
