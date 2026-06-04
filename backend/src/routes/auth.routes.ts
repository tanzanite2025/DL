import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { JWT_SECRET } from '../config/env.js';
import { authenticateToken, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

// 【规则约束：登录情况禁止拉取其他任何数据，登录只验证TOKEN和USER ID】
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '[CRITICAL] 用户名和密码不能为空。' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误。' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: '用户名或密码错误。' });
    }

    // 生成 Token
    const token = jwt.sign(
      { id: user.id, username: user.username, roleId: user.roleId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 【只返回 TOKEN 和 USER ID 满足规则】
    return res.json({
      token,
      userId: user.id,
    });
  } catch (error) {
    console.error('[CRITICAL] 登录处理异常：', error);
    return res.status(500).json({ error: '[CRITICAL] 服务器登录模块异常。' });
  }
});

// 获取当前登录用户的基础信息
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      throw new Error('[CRITICAL] 用户上下文解析失败。');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: '[CRITICAL] 找不到当前登录用户的信息。' });
    }

    const role = user.role;

    // 系统管理员在会话中必须始终拥有全部模块访问与金额查看权限，避免因配置错误看不到任何页面
    const isSystemAdmin = role.protected && role.name === '系统管理员';

    return res.json({
      id: user.id,
      username: user.username,
      role: {
        id: role.id,
        name: role.name,
        protected: role.protected,
        canAccessUsers: isSystemAdmin ? true : role.canAccessUsers,
        canAccessWarehouse: isSystemAdmin ? true : role.canAccessWarehouse,
        canAccessGoods: isSystemAdmin ? true : role.canAccessGoods,
        canAccessFinance: isSystemAdmin ? true : role.canAccessFinance,
        canAccessProducts: isSystemAdmin ? true : role.canAccessProducts,
        canAccessSales: isSystemAdmin ? true : role.canAccessSales,
        canAccessAfterSales: isSystemAdmin ? true : (role as any).canAccessAfterSales ?? false,
        canAccessPurchase: isSystemAdmin ? true : role.canAccessPurchase,
        canAccessAssembly: isSystemAdmin ? true : role.canAccessAssembly,
        canViewCost: isSystemAdmin ? true : role.canViewCost,
        canViewSalesPrice: isSystemAdmin ? true : role.canViewSalesPrice,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || '[CRITICAL] 获取用户信息失败。' });
  }
});

export default router;
