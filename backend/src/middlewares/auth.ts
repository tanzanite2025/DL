import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { JWT_SECRET } from '../config/env.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    roleId: string;
  };
}

// Token 校验中间件
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '[CRITICAL] Token 缺失，未授权访问。' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '[CRITICAL] 无效的 Token 凭证或已过期。' });
    }
    req.user = user as AuthenticatedRequest['user'];
    next();
  });
};

// 角色权限拦截中间件
export const requirePermission = (permissionKey: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user?.roleId) {
      return res.status(403).json({ error: '[CRITICAL] 无权限访问此模块。' });
    }
    try {
      const role = await prisma.role.findUnique({ where: { id: req.user.roleId } });
      if (!role) {
        return res.status(403).json({ error: '[CRITICAL] 角色不存在或已被删除。' });
      }

      // 系统管理员角色在权限中间件中绕过所有权限检查，避免被配置错误锁死
      if (role.protected && role.name === '系统管理员') {
        return next();
      }

      if (!(permissionKey in role) || !(role as any)[permissionKey]) {
        return res.status(403).json({ error: '[CRITICAL] 角色权限矩阵未授予该入口的访问权。' });
      }
      next();
    } catch (err) {
      return res.status(500).json({ error: '权限校验失败' });
    }
  };
};
