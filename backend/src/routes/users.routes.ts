import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

// 用户管理
router.get('/', authenticateToken, requirePermission('canAccessUsers'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    });
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 无法拉取用户账号列表。' });
  }
});

router.post('/', authenticateToken, requirePermission('canAccessUsers'), async (req: AuthenticatedRequest, res: Response) => {
  const { username, password, roleId } = req.body;
  if (!username || !password || !roleId) {
    return res.status(400).json({ error: '[CRITICAL] 新增账号时用户名、密码与角色ID不可为空。' });
  }
  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: { username, passwordHash, roleId },
      include: { role: true },
    });
    return res.json(newUser);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 用户名已存在或创建账号失败。' });
  }
});

router.put('/:id', authenticateToken, requirePermission('canAccessUsers'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { roleId, password } = req.body;
  if (!roleId) {
    return res.status(400).json({ error: '[CRITICAL] 更新账号角色时角色ID不可为空。' });
  }
  try {
    const updateData: any = { roleId };
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(password, salt);
    }
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true },
    });
    return res.json(updatedUser);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 修改账号信息失败。' });
  }
});

router.delete('/:id', authenticateToken, requirePermission('canAccessUsers'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.user.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 删除账号失败。' });
  }
});

export default router;
