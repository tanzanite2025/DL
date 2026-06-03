import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

router.get('/', authenticateToken, requirePermission('canAccessAudit'), async (req: AuthenticatedRequest, res: Response) => {
  const { userId, resource, action, skip = '0', take = '50' } = req.query;
  const skipNum = parseInt(skip as string) || 0;
  const takeNum = Math.min(parseInt(take as string) || 50, 200);

  try {
    const where: any = {};
    if (userId) where.userId = userId as string;
    if (resource) where.resource = resource as string;
    if (action) where.action = { contains: action as string, mode: 'insensitive' };

    const auditClient = (prisma as any).auditLog;
    const [total, records] = await Promise.all([
      auditClient.count({ where }),
      auditClient.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: skipNum,
        take: takeNum,
      }),
    ]);

    return res.json({ total, records });
  } catch (error) {
    console.error('[CRITICAL] 拉取审计日志失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 拉取审计日志失败。' });
  }
});

export default router;
