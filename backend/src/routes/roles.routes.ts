import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

router.get('/', authenticateToken, requirePermission('canAccessUsers'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return res.json(roles);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 无法拉取角色权限矩阵。' });
  }
});

router.post('/', authenticateToken, requirePermission('canAccessUsers'), async (req: AuthenticatedRequest, res: Response) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: '[CRITICAL] 角色名称不可为空。' });
  }
  try {
    const newRole = await prisma.role.create({
      data: { name },
    });
    return res.json(newRole);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 角色名称重复或创建失败。' });
  }
});

router.put('/:id', authenticateToken, requirePermission('canAccessUsers'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { canAccessUsers, canAccessWarehouse, canAccessGoods, canAccessFinance, canAccessProducts, canAccessSales, canAccessPurchase, canAccessAssembly } = req.body;
  try {
    const updatedRole = await prisma.role.update({
      where: { id },
      data: {
        canAccessUsers,
        canAccessWarehouse,
        canAccessGoods,
        canAccessFinance,
        canAccessProducts,
        canAccessSales,
        canAccessPurchase,
        canAccessAssembly,
      },
    });
    return res.json(updatedRole);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 更新权限矩阵失败。' });
  }
});

router.delete('/:id', authenticateToken, requirePermission('canAccessUsers'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      return res.status(404).json({ error: '[CRITICAL] 未找到该角色。' });
    }
    if (role.protected) {
      return res.status(403).json({ error: '[CRITICAL] 系统内置角色不可删除。' });
    }
    const userCount = await prisma.user.count({ where: { roleId: id } });
    if (userCount > 0) {
      return res.status(400).json({ error: `[CRITICAL] 该角色下仍有 ${userCount} 个关联账号，无法删除。请先变更这些账号的角色。` });
    }
    await prisma.role.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 删除角色失败。' });
  }
});

export default router;
