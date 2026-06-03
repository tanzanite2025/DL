import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

export interface AuditContext {
  action?: string;
  resource?: string;
  resourceId?: string | null;
  meta?: Record<string, any>;
}

type AuditRequest = AuthenticatedRequest & { auditContext?: AuditContext };

export const setAuditContext = (req: AuthenticatedRequest, ctx: AuditContext) => {
  const r = req as AuditRequest;
  r.auditContext = { ...(r.auditContext || {}), ...ctx };
};

export const auditMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const startedAt = Date.now();

  res.on('finish', async () => {
    // 仅记录非 GET 请求，避免噪音
    if (req.method === 'GET') return;

    const r = req as AuditRequest;
    const ctx = r.auditContext || {};

    try {
      const forwarded = (req.headers['x-forwarded-for'] as string) || '';
      const ip = forwarded.split(',')[0]?.trim() || req.socket.remoteAddress || null;
      const auditClient = (prisma as any).auditLog;
      if (!auditClient?.create) return;

      await auditClient.create({
        data: {
          userId: req.user?.id || null,
          usernameSnapshot: req.user?.username || null,
          roleIdSnapshot: req.user?.roleId || null,
          action: ctx.action || `${req.method} ${req.path}`,
          resource: ctx.resource || (req.path.split('/')[2] || 'unknown'),
          resourceId: ctx.resourceId || null,
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          ip: ip || undefined,
          userAgent: (req.headers['user-agent'] as string) || null,
          durationMs: Date.now() - startedAt,
          meta: ctx.meta,
        },
      });
    } catch (err) {
      console.error('[AUDIT] 记录失败：', err);
    }
  });

  next();
};
