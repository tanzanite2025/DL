import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { prisma } from './lib/prisma.js';
import { PORT } from './config/env.js';
import { auditMiddleware } from './audit/auditLogger.js';

// 路由模块
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import rolesRoutes from './routes/roles.routes.js';
import warehousesRoutes from './routes/warehouses.routes.js';
import itemsRoutes from './routes/items.routes.js';
import goodsMovesRoutes from './routes/goodsMoves.routes.js';
import financeRoutes from './routes/finance.routes.js';
import purchaseRoutes from './routes/purchase.routes.js';
import salesRoutes from './routes/sales.routes.js';
import afterSalesRoutes from './routes/afterSales.routes.js';
import unitsRoutes from './routes/units.routes.js';
import devRoutes from './routes/dev.routes.js';
import auditRoutes from './routes/audit.routes.js';

const app = express();

// ==================== 全局中间件 ====================
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5500',
  credentials: true,
}));
app.use(express.json());
app.use(auditMiddleware);

// ==================== 数据库自动 Seed ====================
async function seedDatabase() {
  try {
    const roleCount = await prisma.role.count();
    if (roleCount === 0) {
      console.log('检测到数据库为空，开始初始化种子数据...');

      // 1. 创建角色
      const adminRole = await (prisma as any).role.create({
        data: {
          name: '系统管理员',
          protected: true,
          canAccessUsers: true,
          canAccessWarehouse: true,
          canAccessGoods: true,
          canAccessFinance: true,
          canAccessProducts: true,
          canAccessSales: true,
          canAccessAfterSales: true,
          canAccessPurchase: true,
          canAccessAssembly: true,
          canAccessAudit: true,
          canViewCost: true,
          canViewSalesPrice: true,
        },
      });

      const keeperRole = await prisma.role.create({
        data: {
          name: '仓管员',
          canAccessUsers: false,
          canAccessWarehouse: true,
          canAccessGoods: true,
          canAccessFinance: false,
          canAccessProducts: false,
          canAccessAfterSales: true,
          canViewCost: false,
          canViewSalesPrice: false,
        },
      });

      const accountantRole = await prisma.role.create({
        data: {
          name: '财务员',
          canAccessUsers: false,
          canAccessWarehouse: false,
          canAccessGoods: false,
          canAccessFinance: true,
          canAccessProducts: false,
          canAccessAfterSales: false,
          canViewCost: true,
          canViewSalesPrice: true,
        },
      });

      const salesRole = await prisma.role.create({
        data: {
          name: '业务',
          canAccessUsers: false,
          canAccessWarehouse: false,
          canAccessGoods: false,
          canAccessFinance: false,
          canAccessProducts: false,
          canAccessSales: true,
          canAccessAfterSales: true,
          canAccessPurchase: false,
          canAccessAssembly: false,
          canAccessAudit: false,
          canViewCost: false,
          canViewSalesPrice: true,
        },
      });

      const serviceRole = await prisma.role.create({
        data: {
          name: '客服',
          canAccessUsers: false,
          canAccessWarehouse: false,
          canAccessGoods: false,
          canAccessFinance: false,
          canAccessProducts: false,
          canAccessSales: false,
          canAccessAfterSales: true,
          canAccessPurchase: false,
          canAccessAssembly: false,
          canAccessAudit: false,
          canViewCost: false,
          canViewSalesPrice: false,
        },
      });

      // 2. 创建用户 (密码均为 123456)
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('123456', salt);

      await prisma.user.create({
        data: { username: 'admin', passwordHash, roleId: adminRole.id },
      });
      await prisma.user.create({
        data: { username: 'keeper', passwordHash, roleId: keeperRole.id },
      });
      await prisma.user.create({
        data: { username: 'finance', passwordHash, roleId: accountantRole.id },
      });

      // 3. 初始货币
      await prisma.currency.create({
        data: { code: 'CNY', name: '人民币', symbol: '¥', isDefault: true },
      });
      await prisma.currency.create({
        data: { code: 'USD', name: '美元', symbol: '$', isDefault: false },
      });
      await prisma.currency.create({
        data: { code: 'EUR', name: '欧元', symbol: '€', isDefault: false },
      });

      console.log('种子数据初始化成功！');
    }

    // 额外：为计量单位提供基础种子数据（不影响货币）
    const prismaAny = prisma as any;
    const defaultUnits = [
      { code: 'PCS', name: '件' },
      { code: 'BOX', name: '箱' },
      { code: 'SET', name: '套' },
      { code: 'KG', name: '千克' },
    ];

    let createdUnits = 0;
    for (const u of defaultUnits) {
      const exists = await prismaAny.unit.findFirst({ where: { code: u.code } });
      if (!exists) {
        await prismaAny.unit.create({ data: u });
        createdUnits++;
      }
    }

    if (createdUnits > 0) {
      console.log(`已初始化 ${createdUnits} 条基础计量单位种子数据。`);
    }
  } catch (error) {
    console.error('[CRITICAL] 种子数据初始化失败：', error);
  }
}

// ==================== 挂载路由模块 ====================
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/warehouses', warehousesRoutes);
app.use('/api', itemsRoutes);          // /api/items, /api/bom, /api/assembly
app.use('/api/units', unitsRoutes);
app.use('/api/goods-moves', goodsMovesRoutes);
app.use('/api', financeRoutes);         // /api/finance, /api/payment-accounts, /api/currencies
app.use('/api', purchaseRoutes);        // /api/suppliers, /api/purchase-orders
app.use('/api', salesRoutes);           // /api/customers, /api/sales-orders
app.use('/api', afterSalesRoutes);      // /api/after-sales
app.use('/api/dev', devRoutes);
app.use('/api/audit', auditRoutes);

// ==================== 启动服务器 ====================
app.listen(PORT, async () => {
  console.log(`[OK] 后端服务已在 http://localhost:${PORT} 启动`);
  await seedDatabase();
});
