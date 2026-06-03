import { PrismaClient } from '@prisma/client';

// 避免在热重载开发时实例化多个 Prisma Client 耗尽数据库连接池
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
