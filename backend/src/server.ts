import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dalang-erp-dev-secret-key-123456';

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// 数据库自动 Seed 逻辑：如果数据库中无数据，则自动初始化默认数据
async function seedDatabase() {
  try {
    const roleCount = await prisma.role.count();
    if (roleCount === 0) {
      console.log('检测到数据库为空，开始初始化种子数据...');

      // 1. 创建角色
      const adminRole = await prisma.role.create({
        data: {
          name: '系统管理员',
          protected: true,
          canAccessUsers: true,
          canAccessWarehouse: true,
          canAccessGoods: true,
          canAccessFinance: true,
          canAccessProducts: true,
          canAccessSales: true,
          canAccessPurchase: true,
          canAccessAssembly: true,
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
        },
      });

      // 2. 创建用户 (密码均为 123456)
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('123456', salt);

      const adminUser = await prisma.user.create({
        data: {
          username: 'admin',
          passwordHash,
          roleId: adminRole.id,
        },
      });

      await prisma.user.create({
        data: {
          username: 'keeper',
          passwordHash,
          roleId: keeperRole.id,
        },
      });

      await prisma.user.create({
        data: {
          username: 'finance',
          passwordHash,
          roleId: accountantRole.id,
        },
      });

      // 3. 创建初始物料商品
      const item1 = await prisma.item.create({
        data: { code: 'ITEM-001', name: '高强度碳钢板', unit: '张', description: '厚度10mm，规格1500*6000' },
      });
      const item2 = await prisma.item.create({
        data: { code: 'ITEM-002', name: '精密滚珠轴承', unit: '套', description: '型号6204-2RS' },
      });
      const item3 = await prisma.item.create({
        data: { code: 'ITEM-003', name: '尼龙传动带', unit: '条', description: '宽度50mm，长度2400mm' },
      });

      // 4. 创建初始仓库
      const wh1 = await prisma.warehouse.create({
        data: { name: 'A号核心仓', location: '一号工业园区A栋', description: '主要存放钢材原材' },
      });
      const wh2 = await prisma.warehouse.create({
        data: { name: 'B号配件仓', location: '一号工业园区B栋', description: '存放精密五金及配件' },
      });

      // 4.1 创建初始客户
      await prisma.customer.create({
        data: {
          code: 'CUST-001',
          name: '北方重工集团',
          phone: '13800138000',
          email: 'north@heavy.com',
          address: '辽宁省沈阳市铁西区重工街',
        },
      });

      await prisma.customer.create({
        data: {
          code: 'CUST-002',
          name: '华东汽车制造厂',
          phone: '13900139000',
          email: 'east@car.com',
          address: '上海市嘉定区安亭路',
        },
      });

      // 5. 初始货物流转
      await prisma.goodsMove.create({
        data: {
          itemId: item1.id,
          qty: 100,
          type: 'IN',
          toWarehouseId: wh1.id,
          userId: adminUser.id,
          remarks: '首批原材入库',
        },
      });

      await prisma.goodsMove.create({
        data: {
          itemId: item2.id,
          qty: 500,
          type: 'IN',
          toWarehouseId: wh2.id,
          userId: adminUser.id,
          remarks: '零部件采购入库',
        },
      });

      // 6. 初始财务应收应付账单
      await prisma.financialBill.create({
        data: {
          type: 'RECEIVABLE',
          amount: 150000.0,
          paidAmount: 50000.0,
          status: 'PARTIAL',
          partner: '上海重工机械有限公司',
          description: '碳钢板出库销售款',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后
        },
      });

      await prisma.financialBill.create({
        data: {
          type: 'PAYABLE',
          amount: 85000.0,
          paidAmount: 0.0,
          status: 'UNPAID',
          partner: '环球轴承供应部',
          description: '精密滚珠轴承采购应付款',
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15天后
        },
      });

      // 7. 初始收款账户数据
      await prisma.paymentAccount.create({
        data: {
          name: '公司微信收单账号',
          type: 'WECHAT',
          accountNo: 'wx_dalang_pay',
          holder: '大浪科技有限公司',
        }
      });

      await prisma.paymentAccount.create({
        data: {
          name: '招商银行对公基本户',
          type: 'BANK',
          accountNo: '6222080012345678',
          holder: '大浪科技有限公司',
        }
      });

      // 8. 初始货币
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
  } catch (error) {
    console.error('[CRITICAL] 种子数据初始化失败：', error);
  }
}

// 身份验证中间件
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    roleId: string;
  };
}

const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

// 权限校验中间件：校验当前用户是否具有指定模块的访问权限
const requirePermission = (permissionKey: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user?.roleId) {
      return res.status(403).json({ error: '[CRITICAL] 无权限访问此模块。' });
    }
    try {
      const role = await prisma.role.findUnique({ where: { id: req.user.roleId } });
      if (!role || !(permissionKey in role) || !(role as any)[permissionKey]) {
        return res.status(403).json({ error: '[CRITICAL] 无权限访问此模块。' });
      }
      next();
    } catch (error) {
      return res.status(500).json({ error: '[CRITICAL] 权限校验失败。' });
    }
  };
};

// ---------------------- 登录 API ----------------------
// 【规则约束：登录情况禁止拉取其他任何数据，登录只验证TOKEN和USER ID】
app.post('/api/auth/login', async (req: Request, res: Response) => {
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

// 获取当前登录用户的基础信息（用于登录后在顶栏展示用户名及获取权限）
app.get('/api/auth/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
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

    return res.json({
      id: user.id,
      username: user.username,
      role: {
        id: user.role.id,
        name: user.role.name,
        protected: user.role.protected,
        canAccessUsers: user.role.canAccessUsers,
        canAccessWarehouse: user.role.canAccessWarehouse,
        canAccessGoods: user.role.canAccessGoods,
        canAccessFinance: user.role.canAccessFinance,
        canAccessProducts: user.role.canAccessProducts,
        canAccessSales: user.role.canAccessSales,
        canAccessPurchase: user.role.canAccessPurchase,
        canAccessAssembly: user.role.canAccessAssembly,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || '[CRITICAL] 获取用户信息失败。' });
  }
});

// ---------------------- 账号与角色权限矩阵 API ----------------------
app.get('/api/users', authenticateToken, requirePermission('canAccessUsers'), async (req: AuthenticatedRequest, res: Response) => {
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

app.post('/api/users', authenticateToken, requirePermission('canAccessUsers'), async (req: AuthenticatedRequest, res: Response) => {
  const { username, password, roleId } = req.body;
  if (!username || !password || !roleId) {
    return res.status(400).json({ error: '[CRITICAL] 新增账号时用户名、密码与角色ID不可为空。' });
  }
  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        username,
        passwordHash,
        roleId,
      },
      include: { role: true },
    });
    return res.json(newUser);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 用户名已存在或创建账号失败。' });
  }
});

app.put('/api/users/:id', authenticateToken, requirePermission('canAccessUsers'), async (req: AuthenticatedRequest, res: Response) => {
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

app.delete('/api/users/:id', authenticateToken, requirePermission('canAccessUsers'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.user.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 删除账号失败。' });
  }
});

app.get('/api/roles', authenticateToken, requirePermission('canAccessUsers'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return res.json(roles);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 无法拉取角色权限矩阵。' });
  }
});

app.post('/api/roles', authenticateToken, requirePermission('canAccessUsers'), async (req: AuthenticatedRequest, res: Response) => {
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

app.put('/api/roles/:id', authenticateToken, requirePermission('canAccessUsers'), async (req: AuthenticatedRequest, res: Response) => {
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

app.delete('/api/roles/:id', authenticateToken, requirePermission('canAccessUsers'), async (req: AuthenticatedRequest, res: Response) => {
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

// ---------------------- 仓库与货位 API ----------------------
app.get('/api/warehouses', authenticateToken, requirePermission('canAccessWarehouse'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return res.json(warehouses);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 无法拉取仓库列表。' });
  }
});

app.post('/api/warehouses', authenticateToken, requirePermission('canAccessWarehouse'), async (req: AuthenticatedRequest, res: Response) => {
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

app.put('/api/warehouses/:id', authenticateToken, requirePermission('canAccessWarehouse'), async (req: AuthenticatedRequest, res: Response) => {
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

app.delete('/api/warehouses/:id', authenticateToken, requirePermission('canAccessWarehouse'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.warehouse.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 该仓库有关联流转记录，无法删除。' });
  }
});

// ---------------------- 货物流转与物料 API ----------------------
app.get('/api/items', authenticateToken, requirePermission('canAccessGoods'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const items = await prisma.item.findMany({
      orderBy: { code: 'asc' },
    });
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 无法拉取物料编码列表。' });
  }
});

app.post('/api/items', authenticateToken, requirePermission('canAccessGoods'), async (req: AuthenticatedRequest, res: Response) => {
  const { name, unit, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: '[CRITICAL] 物料名称不可为空。' });
  }
  try {
    // 自动扫描当前所有的 ITEM 编码，寻找最大数字以递增
    const items = await prisma.item.findMany({
      select: { code: true }
    });

    let nextNum = 1;
    const regex = /^ITEM-(\d+)$/;
    items.forEach(it => {
      const match = it.code.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNum) {
          nextNum = num + 1;
        }
      }
    });

    // 格式化为 ITEM-001, ITEM-002 格式（不足三位补零）
    const paddedNum = String(nextNum).padStart(3, '0');
    const generatedCode = `ITEM-${paddedNum}`;

    const newItem = await prisma.item.create({
      data: {
        code: generatedCode,
        name,
        unit: unit || '件',
        description
      },
    });
    return res.json(newItem);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 自动生成编码并创建产品失败。' });
  }
});

app.put('/api/items/:id', authenticateToken, requirePermission('canAccessGoods'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { code, name, unit, description } = req.body;
  try {
    const updated = await prisma.item.update({
      where: { id },
      data: { code, name, unit, description }
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 更新物料失败。' });
  }
});

app.delete('/api/items/:id', authenticateToken, requirePermission('canAccessGoods'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.item.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 该物料已有关联流转记录，无法删除。' });
  }
});

app.get('/api/goods-moves', authenticateToken, requirePermission('canAccessGoods'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const moves = await prisma.goodsMove.findMany({
      include: {
        item: true,
        fromWarehouse: true,
        toWarehouse: true,
        user: { select: { username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(moves);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 无法拉取货物流转记录。' });
  }
});

app.post('/api/goods-moves', authenticateToken, requirePermission('canAccessGoods'), async (req: AuthenticatedRequest, res: Response) => {
  const { itemId, qty, type, fromWarehouseId, toWarehouseId, remarks } = req.body;
  const userId = req.user?.id;

  if (!itemId || !qty || !type || !userId) {
    return res.status(400).json({ error: '[CRITICAL] 流转操作缺少核心参数（物料、数量、类型）。' });
  }

  // 校验逻辑
  if (type === 'OUT' && !fromWarehouseId) {
    return res.status(400).json({ error: '[CRITICAL] 出库操作必须指定源仓库。' });
  }
  if (type === 'IN' && !toWarehouseId) {
    return res.status(400).json({ error: '[CRITICAL] 入库操作必须指定目标仓库。' });
  }
  if (type === 'TRANSFER' && (!fromWarehouseId || !toWarehouseId)) {
    return res.status(400).json({ error: '[CRITICAL] 调拨操作必须同时指定源仓库和目标仓库。' });
  }

  try {
    // 乐观库存检验（对于出库和调拨，检验源仓库的当前可用数量）
    if (type === 'OUT' || type === 'TRANSFER') {
      const moves = await prisma.goodsMove.findMany({
        where: {
          itemId,
          OR: [
            { fromWarehouseId: fromWarehouseId },
            { toWarehouseId: fromWarehouseId }
          ]
        }
      });
      let stock = 0;
      for (const m of moves) {
        if (m.toWarehouseId === fromWarehouseId) stock += m.qty;
        if (m.fromWarehouseId === fromWarehouseId) stock -= m.qty;
      }
      if (stock < qty) {
        return res.status(400).json({ error: `[CRITICAL] 源仓库库存不足。当前库存为 ${stock}。` });
      }
    }

    const newMove = await prisma.goodsMove.create({
      data: {
        itemId,
        qty: parseInt(qty),
        type,
        fromWarehouseId: fromWarehouseId || null,
        toWarehouseId: toWarehouseId || null,
        userId,
        remarks,
      },
      include: {
        item: true,
        fromWarehouse: true,
        toWarehouse: true,
        user: { select: { username: true } },
      },
    });

    return res.json(newMove);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: '[CRITICAL] 执行货物流转登记失败。' });
  }
});

// ---------------------- 应收应付账款 API ----------------------
app.get('/api/finance', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const bills = await prisma.financialBill.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json(bills);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 无法拉取应收应付账单。' });
  }
});

app.post('/api/finance', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  const { type, amount, partner, description, dueDate } = req.body;
  if (!type || !amount || !partner || !dueDate) {
    return res.status(400).json({ error: '[CRITICAL] 账单录入缺少核心字段（收付类型、金额、往来单位、到期日）。' });
  }
  try {
    const newBill = await prisma.financialBill.create({
      data: {
        type,
        amount: parseFloat(amount),
        partner,
        description,
        dueDate: new Date(dueDate),
        status: 'UNPAID',
        paidAmount: 0.0,
      },
    });
    return res.json(newBill);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 录入账单失败。' });
  }
});

app.put('/api/finance/:id/pay', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { payAmount } = req.body;

  if (!payAmount || parseFloat(payAmount) <= 0) {
    return res.status(400).json({ error: '[CRITICAL] 核销金额必须大于零。' });
  }

  try {
    const bill = await prisma.financialBill.findUnique({ where: { id } });
    if (!bill) {
      return res.status(404).json({ error: '[CRITICAL] 未找到对应账单。' });
    }

    const newPaidAmount = bill.paidAmount + parseFloat(payAmount);
    if (newPaidAmount > bill.amount) {
      return res.status(400).json({ error: `[CRITICAL] 累计核销金额超过账单总金额。账单金额: ${bill.amount}, 当前已付: ${bill.paidAmount}` });
    }

    const status = newPaidAmount === bill.amount ? 'PAID' : 'PARTIAL';

    const updated = await prisma.financialBill.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        status,
      },
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 核销操作失败。' });
  }
});

app.delete('/api/finance/:id', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.financialBill.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 删除账单失败。' });
  }
});

// ---------------------- 收款账户 API ----------------------
app.get('/api/payment-accounts', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const accounts = await prisma.paymentAccount.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return res.json(accounts);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 无法拉取收付款账户列表。' });
  }
});

app.post('/api/payment-accounts', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  const { name, type, accountNo, holder } = req.body;
  if (!name || !type || !accountNo) {
    return res.status(400).json({ error: '[CRITICAL] 账户名称、类型及卡号/微信号不可为空。' });
  }
  try {
    const newAccount = await prisma.paymentAccount.create({
      data: { name, type, accountNo, holder },
    });
    return res.json(newAccount);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 创建收付款账户失败。' });
  }
});

app.put('/api/payment-accounts/:id', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, type, accountNo, holder } = req.body;
  try {
    const updated = await prisma.paymentAccount.update({
      where: { id },
      data: { name, type, accountNo, holder },
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 更新收付款账户失败。' });
  }
});

app.delete('/api/payment-accounts/:id', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.paymentAccount.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 删除收付款账户失败。' });
  }
});

// ---------------------- 货币管理 API ----------------------
app.get('/api/currencies', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currencies = await prisma.currency.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return res.json(currencies);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 无法拉取货币列表。' });
  }
});

app.post('/api/currencies', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  const { code, name, symbol, isDefault } = req.body;
  if (!code || !name || !symbol) {
    return res.status(400).json({ error: '[CRITICAL] 货币代码、名称和符号不可为空。' });
  }
  try {
    if (isDefault) {
      const currentDefault = await prisma.currency.findFirst({ where: { isDefault: true } });
      if (currentDefault) {
        await prisma.currency.update({ where: { id: currentDefault.id }, data: { isDefault: false } });
      }
    }
    const newCurrency = await prisma.currency.create({
      data: { code: code.toUpperCase(), name, symbol, isDefault: isDefault || false },
    });
    return res.json(newCurrency);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 货币代码重复或创建失败。' });
  }
});

app.put('/api/currencies/:id', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { code, name, symbol, isDefault } = req.body;
  if (!code || !name || !symbol) {
    return res.status(400).json({ error: '[CRITICAL] 货币代码、名称和符号不可为空。' });
  }
  try {
    if (isDefault) {
      const currentDefault = await prisma.currency.findFirst({ where: { isDefault: true } });
      if (currentDefault && currentDefault.id !== id) {
        await prisma.currency.update({ where: { id: currentDefault.id }, data: { isDefault: false } });
      }
    }
    const updated = await prisma.currency.update({
      where: { id },
      data: { code: code.toUpperCase(), name, symbol, isDefault: isDefault || false },
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 更新货币失败。' });
  }
});

app.delete('/api/currencies/:id', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const currency = await prisma.currency.findUnique({ where: { id } });
    if (!currency) {
      return res.status(404).json({ error: '[CRITICAL] 未找到该货币。' });
    }
    if (currency.isDefault) {
      return res.status(403).json({ error: '[CRITICAL] 默认货币不可删除，请先设置其他货币为默认。' });
    }
    await prisma.currency.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 删除货币失败。' });
  }
});

// ---------------------- 供应商管理 API ----------------------
app.get('/api/suppliers', authenticateToken, requirePermission('canAccessPurchase'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json(suppliers);
  } catch (error) {
    console.error('[CRITICAL] 无法拉取供应商列表：', error);
    return res.status(500).json({ error: '[CRITICAL] 无法拉取供应商列表。' });
  }
});

app.post('/api/suppliers', authenticateToken, requirePermission('canAccessPurchase'), async (req: AuthenticatedRequest, res: Response) => {
  const { name, contactPerson, phone, email, address, remarks } = req.body;
  if (!name) {
    return res.status(400).json({ error: '[CRITICAL] 供应商名称不可为空。' });
  }
  try {
    const existing = await prisma.supplier.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: '[CRITICAL] 该供应商名称已存在。' });
    }

    // 自动扫描当前所有的供应商编码，寻找最大数字以递增
    const suppliers = await prisma.supplier.findMany({
      select: { code: true }
    });

    let nextNum = 1;
    const regex = /^SUPP-(\d+)$/;
    suppliers.forEach(s => {
      const match = s.code.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNum) {
          nextNum = num + 1;
        }
      }
    });

    const paddedNum = String(nextNum).padStart(3, '0');
    const generatedCode = `SUPP-${paddedNum}`;

    const newSupplier = await prisma.supplier.create({
      data: {
        code: generatedCode,
        name,
        contactPerson,
        phone,
        email,
        address,
        remarks,
      },
    });
    return res.json(newSupplier);
  } catch (error) {
    console.error('[CRITICAL] 登记供应商失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 登记供应商失败。' });
  }
});

app.put('/api/suppliers/:id', authenticateToken, requirePermission('canAccessPurchase'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, contactPerson, phone, email, address, remarks } = req.body;
  if (!name) {
    return res.status(400).json({ error: '[CRITICAL] 供应商名称不可为空。' });
  }
  try {
    const existing = await prisma.supplier.findFirst({
      where: {
        name,
        NOT: { id }
      }
    });
    if (existing) {
      return res.status(400).json({ error: '[CRITICAL] 该供应商名称已被其他供应商占用。' });
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: { name, contactPerson, phone, email, address, remarks },
    });
    return res.json(updated);
  } catch (error) {
    console.error('[CRITICAL] 更新供应商失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 更新供应商失败。' });
  }
});

app.delete('/api/suppliers/:id', authenticateToken, requirePermission('canAccessPurchase'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const orderCount = await prisma.purchaseOrder.count({
      where: { supplierId: id }
    });
    if (orderCount > 0) {
      return res.status(400).json({ error: '[CRITICAL] 该供应商有关联采购订单，无法删除。' });
    }

    await prisma.supplier.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error('[CRITICAL] 删除供应商失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 删除供应商失败。' });
  }
});

// ---------------------- 采购订单 API ----------------------
app.get('/api/purchase-orders', authenticateToken, requirePermission('canAccessPurchase'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        item: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(orders);
  } catch (error) {
    console.error('[CRITICAL] 无法拉取采购订单：', error);
    return res.status(500).json({ error: '[CRITICAL] 无法拉取采购订单。' });
  }
});

app.post('/api/purchase-orders', authenticateToken, requirePermission('canAccessPurchase'), async (req: AuthenticatedRequest, res: Response) => {
  const { supplierId, itemId, qty, price, status, expectedDate } = req.body;
  if (!supplierId || !itemId || qty === undefined || price === undefined) {
    return res.status(400).json({ error: '[CRITICAL] 采购订单录入缺少核心字段（供应商、物料、数量、单价）。' });
  }
  const parsedQty = parseInt(qty);
  const parsedPrice = parseFloat(price);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    return res.status(400).json({ error: '[CRITICAL] 数量必须是大于零的整数。' });
  }
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({ error: '[CRITICAL] 单价不能小于零。' });
  }

  try {
    // 自动扫描当前所有的订单编号，寻找最大数字以递增
    const orders = await prisma.purchaseOrder.findMany({
      select: { orderNo: true }
    });

    let nextNum = 1;
    const regex = /^PO-(\d+)$/;
    orders.forEach(o => {
      const match = o.orderNo.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNum) {
          nextNum = num + 1;
        }
      }
    });

    const paddedNum = String(nextNum).padStart(3, '0');
    const generatedOrderNo = `PO-${paddedNum}`;
    const totalPrice = parsedQty * parsedPrice;

    const newOrder = await prisma.purchaseOrder.create({
      data: {
        orderNo: generatedOrderNo,
        supplierId,
        itemId,
        qty: parsedQty,
        price: parsedPrice,
        totalPrice,
        status: status || 'DRAFT',
        expectedDate: expectedDate ? new Date(expectedDate) : null,
      },
      include: {
        supplier: true,
        item: true,
      }
    });
    return res.json(newOrder);
  } catch (error) {
    console.error('[CRITICAL] 录入采购订单失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 录入采购订单失败。' });
  }
});

app.put('/api/purchase-orders/:id', authenticateToken, requirePermission('canAccessPurchase'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { supplierId, itemId, qty, price, status, expectedDate } = req.body;
  if (!supplierId || !itemId || qty === undefined || price === undefined || !status) {
    return res.status(400).json({ error: '[CRITICAL] 更新采购订单缺少核心字段（供应商、物料、数量、单价、状态）。' });
  }
  const parsedQty = parseInt(qty);
  const parsedPrice = parseFloat(price);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    return res.status(400).json({ error: '[CRITICAL] 数量必须是大于零的整数。' });
  }
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({ error: '[CRITICAL] 单价不能小于零。' });
  }

  try {
    const existingOrder = await prisma.purchaseOrder.findUnique({
      where: { id }
    });
    if (!existingOrder) {
      return res.status(404).json({ error: '[CRITICAL] 未找到该采购订单。' });
    }

    const totalPrice = parsedQty * parsedPrice;
    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        supplierId,
        itemId,
        qty: parsedQty,
        price: parsedPrice,
        totalPrice,
        status,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
      },
      include: {
        supplier: true,
        item: true,
      }
    });
    return res.json(updated);
  } catch (error) {
    console.error('[CRITICAL] 更新采购订单失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 更新采购订单失败。' });
  }
});

app.delete('/api/purchase-orders/:id', authenticateToken, requirePermission('canAccessPurchase'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.purchaseOrder.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error('[CRITICAL] 删除采购订单失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 删除采购订单失败。' });
  }
});

// 采购订单收货登记（自动创建入库流转记录）
app.post('/api/purchase-orders/:id/receive', authenticateToken, requirePermission('canAccessPurchase'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { receiveQty, warehouseId } = req.body;
  const userId = req.user?.id;

  if (!receiveQty || !warehouseId || !userId) {
    return res.status(400).json({ error: '[CRITICAL] 收货登记缺少核心参数（收货数量、目标仓库）。' });
  }

  const parsedReceiveQty = parseInt(receiveQty);
  if (isNaN(parsedReceiveQty) || parsedReceiveQty <= 0) {
    return res.status(400).json({ error: '[CRITICAL] 收货数量必须是大于零的整数。' });
  }

  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { item: true, supplier: true }
    });

    if (!order) {
      return res.status(404).json({ error: '[CRITICAL] 未找到该采购订单。' });
    }

    const remainingQty = order.qty - order.receivedQty;
    if (parsedReceiveQty > remainingQty) {
      return res.status(400).json({ error: `[CRITICAL] 收货数量不能超过未收货数量。未收货数量: ${remainingQty}` });
    }

    // 更新采购订单的已收货数量
    const newReceivedQty = order.receivedQty + parsedReceiveQty;
    const newStatus = newReceivedQty >= order.qty ? 'RECEIVED' : order.status;

    await prisma.purchaseOrder.update({
      where: { id },
      data: {
        receivedQty: newReceivedQty,
        status: newStatus,
      },
    });

    // 自动创建入库流转记录
    await prisma.goodsMove.create({
      data: {
        itemId: order.itemId,
        qty: parsedReceiveQty,
        type: 'IN',
        toWarehouseId: warehouseId,
        userId,
        remarks: `采购订单 ${order.orderNo} 收货入库 - 供应商: ${order.supplier.name}`,
      },
    });

    // 返回更新后的订单信息
    const updated = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        item: true,
      }
    });

    return res.json(updated);
  } catch (error) {
    console.error('[CRITICAL] 采购收货登记失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 采购收货登记失败。' });
  }
});

// ---------------------- 客户管理 API ----------------------
app.get('/api/customers', authenticateToken, requirePermission('canAccessSales'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json(customers);
  } catch (error) {
    console.error('[CRITICAL] 无法拉取客户列表：', error);
    return res.status(500).json({ error: '[CRITICAL] 无法拉取客户列表。' });
  }
});

app.post('/api/customers', authenticateToken, requirePermission('canAccessSales'), async (req: AuthenticatedRequest, res: Response) => {
  const { name, phone, email, address } = req.body;
  if (!name) {
    return res.status(400).json({ error: '[CRITICAL] 客户名称不可为空。' });
  }
  try {
    const existing = await prisma.customer.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: '[CRITICAL] 该客户名称已存在。' });
    }

    // 自动扫描当前所有的客户编码，寻找最大数字以递增
    const customers = await prisma.customer.findMany({
      select: { code: true }
    });

    let nextNum = 1;
    const regex = /^CUST-(\d+)$/;
    customers.forEach(c => {
      const match = c.code.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNum) {
          nextNum = num + 1;
        }
      }
    });

    const paddedNum = String(nextNum).padStart(3, '0');
    const generatedCode = `CUST-${paddedNum}`;

    const newCustomer = await prisma.customer.create({
      data: {
        code: generatedCode,
        name,
        phone,
        email,
        address,
      },
    });
    return res.json(newCustomer);
  } catch (error) {
    console.error('[CRITICAL] 登记客户失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 登记客户失败。' });
  }
});

app.put('/api/customers/:id', authenticateToken, requirePermission('canAccessSales'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, phone, email, address } = req.body;
  if (!name) {
    return res.status(400).json({ error: '[CRITICAL] 客户名称不可为空。' });
  }
  try {
    const existing = await prisma.customer.findFirst({
      where: {
        name,
        NOT: { id }
      }
    });
    if (existing) {
      return res.status(400).json({ error: '[CRITICAL] 该客户名称已被其他客户占用。' });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: { name, phone, email, address },
    });
    return res.json(updated);
  } catch (error) {
    console.error('[CRITICAL] 更新客户失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 更新客户失败。' });
  }
});

app.delete('/api/customers/:id', authenticateToken, requirePermission('canAccessSales'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const orderCount = await prisma.salesOrder.count({
      where: { customerId: id }
    });
    if (orderCount > 0) {
      return res.status(400).json({ error: '[CRITICAL] 该客户有关联销售订单，无法删除。' });
    }

    await prisma.customer.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error('[CRITICAL] 删除客户失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 删除客户失败。' });
  }
});

// ---------------------- 销售订单 API ----------------------
app.get('/api/sales-orders', authenticateToken, requirePermission('canAccessSales'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = await prisma.salesOrder.findMany({
      include: {
        customer: true,
        item: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(orders);
  } catch (error) {
    console.error('[CRITICAL] 无法拉取销售订单：', error);
    return res.status(500).json({ error: '[CRITICAL] 无法拉取销售订单。' });
  }
});

app.post('/api/sales-orders', authenticateToken, requirePermission('canAccessSales'), async (req: AuthenticatedRequest, res: Response) => {
  const { customerId, itemId, qty, price, status } = req.body;
  if (!customerId || !itemId || qty === undefined || price === undefined) {
    return res.status(400).json({ error: '[CRITICAL] 销售订单录入缺少核心字段（客户、物料、数量、单价）。' });
  }
  const parsedQty = parseInt(qty);
  const parsedPrice = parseFloat(price);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    return res.status(400).json({ error: '[CRITICAL] 数量必须是大于零的整数。' });
  }
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({ error: '[CRITICAL] 单价不能小于零。' });
  }

  try {
    // 自动扫描当前所有的订单编号，寻找最大数字以递增
    const orders = await prisma.salesOrder.findMany({
      select: { orderNo: true }
    });

    let nextNum = 1;
    const regex = /^SO-(\d+)$/;
    orders.forEach(o => {
      const match = o.orderNo.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNum) {
          nextNum = num + 1;
        }
      }
    });

    const paddedNum = String(nextNum).padStart(3, '0');
    const generatedOrderNo = `SO-${paddedNum}`;
    const totalPrice = parsedQty * parsedPrice;

    const newOrder = await prisma.salesOrder.create({
      data: {
        orderNo: generatedOrderNo,
        customerId,
        itemId,
        qty: parsedQty,
        price: parsedPrice,
        totalPrice,
        status: status || 'DRAFT',
      },
      include: {
        customer: true,
        item: true,
      }
    });
    return res.json(newOrder);
  } catch (error) {
    console.error('[CRITICAL] 录入销售订单失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 录入销售订单失败。' });
  }
});

app.put('/api/sales-orders/:id', authenticateToken, requirePermission('canAccessSales'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { customerId, itemId, qty, price, status } = req.body;
  if (!customerId || !itemId || qty === undefined || price === undefined || !status) {
    return res.status(400).json({ error: '[CRITICAL] 更新销售订单缺少核心字段（客户、物料、数量、单价、状态）。' });
  }
  const parsedQty = parseInt(qty);
  const parsedPrice = parseFloat(price);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    return res.status(400).json({ error: '[CRITICAL] 数量必须是大于零的整数。' });
  }
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({ error: '[CRITICAL] 单价不能小于零。' });
  }

  try {
    const existingOrder = await prisma.salesOrder.findUnique({
      where: { id }
    });
    if (!existingOrder) {
      return res.status(404).json({ error: '[CRITICAL] 未找到该销售订单。' });
    }

    if (existingOrder.status === 'CLOSED') {
      return res.status(400).json({ error: '[CRITICAL] 该销售订单已生成财务账单，状态为 CLOSED，不可修改。' });
    }

    const totalPrice = parsedQty * parsedPrice;
    const updated = await prisma.salesOrder.update({
      where: { id },
      data: {
        customerId,
        itemId,
        qty: parsedQty,
        price: parsedPrice,
        totalPrice,
        status,
      },
      include: {
        customer: true,
        item: true,
      }
    });
    return res.json(updated);
  } catch (error) {
    console.error('[CRITICAL] 更新销售订单失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 更新销售订单失败。' });
  }
});

app.delete('/api/sales-orders/:id', authenticateToken, requirePermission('canAccessSales'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const existingOrder = await prisma.salesOrder.findUnique({
      where: { id }
    });
    if (!existingOrder) {
      return res.status(404).json({ error: '[CRITICAL] 未找到该销售订单。' });
    }
    if (existingOrder.status === 'CLOSED') {
      return res.status(400).json({ error: '[CRITICAL] 该销售订单已完成并生成财务账单，不可删除。' });
    }

    await prisma.salesOrder.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error('[CRITICAL] 删除销售订单失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 删除销售订单失败。' });
  }
});

app.post('/api/sales-orders/:id/create-bill', authenticateToken, requirePermission('canAccessSales'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: { customer: true }
    });

    if (!order) {
      return res.status(404).json({ error: '[CRITICAL] 找不到该销售订单。' });
    }

    if (order.status === 'CLOSED') {
      return res.status(400).json({ error: '[CRITICAL] 该销售订单已经生成过财务账单，无法重复操作。' });
    }

    // 1. 创建财务应收账单
    // 账期为30天后
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const newBill = await prisma.financialBill.create({
      data: {
        type: 'RECEIVABLE',
        amount: order.totalPrice,
        paidAmount: 0.0,
        status: 'UNPAID',
        partner: order.customer.name,
        description: `由销售单 ${order.orderNo} 自动生成`,
        dueDate,
      }
    });

    // 2. 更新销售订单状态为 CLOSED
    const updatedOrder = await prisma.salesOrder.update({
      where: { id },
      data: { status: 'CLOSED' },
      include: { customer: true, item: true }
    });

    return res.json({
      success: true,
      bill: newBill,
      order: updatedOrder
    });
  } catch (error) {
    console.error('[CRITICAL] 销售单生成财务账单联动失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 销售单生成财务账单联动失败。' });
  }
});

// ---------------------- BOM 配置 API ----------------------
app.get('/api/bom', authenticateToken, requirePermission('canAccessAssembly'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const items = await prisma.item.findMany({
      where: {
        type: 'PRODUCT',
        bomComponents: {
          some: {}
        }
      },
      include: {
        bomComponents: {
          include: {
            componentItem: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(items);
  } catch (error) {
    console.error('[CRITICAL] 获取 BOM 列表失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 获取 BOM 列表失败。' });
  }
});

app.get('/api/bom/:itemId', authenticateToken, requirePermission('canAccessAssembly'), async (req: AuthenticatedRequest, res: Response) => {
  const { itemId } = req.params;
  try {
    const bom = await prisma.bomComponent.findMany({
      where: { parentItemId: itemId },
      include: {
        componentItem: true
      },
      orderBy: { createdAt: 'asc' }
    });
    return res.json(bom);
  } catch (error) {
    console.error('[CRITICAL] 获取 BOM 清单失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 获取 BOM 清单失败。' });
  }
});

app.post('/api/bom', authenticateToken, requirePermission('canAccessAssembly'), async (req: AuthenticatedRequest, res: Response) => {
  const { parentItemId, components } = req.body;
  
  if (!parentItemId || !Array.isArray(components)) {
    return res.status(400).json({ error: '[CRITICAL] 缺少必要参数。' });
  }

  try {
    const parentItem = await prisma.item.findUnique({ where: { id: parentItemId } });
    if (!parentItem) {
      return res.status(404).json({ error: '[CRITICAL] 成品不存在。' });
    }
    if (parentItem.type !== 'PRODUCT') {
      return res.status(400).json({ error: '[CRITICAL] 只能为成品类型的物料配置 BOM。' });
    }

    await prisma.bomComponent.deleteMany({
      where: { parentItemId }
    });

    if (components.length > 0) {
      await prisma.bomComponent.createMany({
        data: components.map((c: any) => ({
          parentItemId,
          componentItemId: c.componentItemId,
          quantity: parseInt(c.quantity),
          remarks: c.remarks || null
        }))
      });
    }

    const newBom = await prisma.bomComponent.findMany({
      where: { parentItemId },
      include: {
        componentItem: true
      }
    });

    return res.json(newBom);
  } catch (error) {
    console.error('[CRITICAL] 保存 BOM 配置失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 保存 BOM 配置失败。' });
  }
});

app.delete('/api/bom/:parentId/:componentId', authenticateToken, requirePermission('canAccessAssembly'), async (req: AuthenticatedRequest, res: Response) => {
  const { parentId, componentId } = req.params;
  try {
    await prisma.bomComponent.delete({
      where: {
        parentItemId_componentItemId: {
          parentItemId: parentId,
          componentItemId: componentId
        }
      }
    });
    return res.json({ success: true });
  } catch (error) {
    console.error('[CRITICAL] 删除 BOM 零件失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 删除 BOM 零件失败。' });
  }
});

// ---------------------- 组装操作 API ----------------------
app.post('/api/assembly/check', authenticateToken, requirePermission('canAccessAssembly'), async (req: AuthenticatedRequest, res: Response) => {
  const { assembledItemId, quantity, warehouseId } = req.body;

  if (!assembledItemId || !quantity || !warehouseId) {
    return res.status(400).json({ error: '[CRITICAL] 缺少必要参数。' });
  }

  try {
    const bom = await prisma.bomComponent.findMany({
      where: { parentItemId: assembledItemId },
      include: {
        componentItem: true
      }
    });

    if (bom.length === 0) {
      return res.status(400).json({ error: '[CRITICAL] 该成品未配置 BOM 清单，无法组装。' });
    }

    const stockCheck = [];
    for (const component of bom) {
      const requiredQty = component.quantity * parseInt(quantity);
      
      const moves = await prisma.goodsMove.findMany({
        where: {
          itemId: component.componentItemId,
          OR: [
            { fromWarehouseId: warehouseId },
            { toWarehouseId: warehouseId }
          ]
        }
      });

      let stock = 0;
      for (const m of moves) {
        if (m.toWarehouseId === warehouseId) stock += m.qty;
        if (m.fromWarehouseId === warehouseId) stock -= m.qty;
      }

      stockCheck.push({
        componentItem: component.componentItem,
        requiredQty,
        currentStock: stock,
        sufficient: stock >= requiredQty
      });
    }

    const allSufficient = stockCheck.every(c => c.sufficient);

    return res.json({
      canAssemble: allSufficient,
      stockCheck
    });
  } catch (error) {
    console.error('[CRITICAL] 库存检查失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 库存检查失败。' });
  }
});

app.post('/api/assembly/assemble', authenticateToken, requirePermission('canAccessAssembly'), async (req: AuthenticatedRequest, res: Response) => {
  const { assembledItemId, quantity, warehouseId, remarks } = req.body;
  const userId = req.user?.id;

  if (!assembledItemId || !quantity || !warehouseId || !userId) {
    return res.status(400).json({ error: '[CRITICAL] 缺少必要参数。' });
  }

  try {
    const bom = await prisma.bomComponent.findMany({
      where: { parentItemId: assembledItemId },
      include: {
        componentItem: true
      }
    });

    if (bom.length === 0) {
      return res.status(400).json({ error: '[CRITICAL] 该成品未配置 BOM 清单，无法组装。' });
    }

    for (const component of bom) {
      const requiredQty = component.quantity * parseInt(quantity);
      const moves = await prisma.goodsMove.findMany({
        where: {
          itemId: component.componentItemId,
          OR: [
            { fromWarehouseId: warehouseId },
            { toWarehouseId: warehouseId }
          ]
        }
      });

      let stock = 0;
      for (const m of moves) {
        if (m.toWarehouseId === warehouseId) stock += m.qty;
        if (m.fromWarehouseId === warehouseId) stock -= m.qty;
      }

      if (stock < requiredQty) {
        return res.status(400).json({ 
          error: `[CRITICAL] ${component.componentItem.name} 库存不足。需要 ${requiredQty}，库存 ${stock}。` 
        });
      }
    }

    let totalCost = 0;
    for (const component of bom) {
      totalCost += component.componentItem.cost * component.quantity * parseInt(quantity);
    }

    const result = await prisma.$transaction(async (tx) => {
      const componentMoves = [];
      for (const component of bom) {
        const move = await tx.goodsMove.create({
          data: {
            itemId: component.componentItemId,
            qty: component.quantity * parseInt(quantity),
            type: 'OUT',
            fromWarehouseId: warehouseId,
            userId,
            remarks: `组装消耗：${remarks || ''}`
          },
          include: {
            item: true
          }
        });
        componentMoves.push(move);
      }

      const productMove = await tx.goodsMove.create({
        data: {
          itemId: assembledItemId,
          qty: parseInt(quantity),
          type: 'IN',
          toWarehouseId: warehouseId,
          userId,
          remarks: `组装生产：${remarks || ''}`
        },
        include: {
          item: true
        }
      });

      const assemblyLog = await tx.assemblyLog.create({
        data: {
          type: 'ASSEMBLE',
          assembledItemId,
          quantity: parseInt(quantity),
          totalCost,
          warehouseId,
          userId,
          remarks
        },
        include: {
          assembledItem: true,
          warehouse: true,
          user: { select: { username: true } }
        }
      });

      return { assemblyLog, componentMoves, productMove };
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[CRITICAL] 组装操作失败：', error);
    return res.status(500).json({ error: error.message || '[CRITICAL] 组装操作失败。' });
  }
});

app.post('/api/assembly/disassemble', authenticateToken, requirePermission('canAccessAssembly'), async (req: AuthenticatedRequest, res: Response) => {
  const { assembledItemId, quantity, warehouseId, remarks } = req.body;
  const userId = req.user?.id;

  if (!assembledItemId || !quantity || !warehouseId || !userId) {
    return res.status(400).json({ error: '[CRITICAL] 缺少必要参数。' });
  }

  try {
    const bom = await prisma.bomComponent.findMany({
      where: { parentItemId: assembledItemId },
      include: {
        componentItem: true
      }
    });

    if (bom.length === 0) {
      return res.status(400).json({ error: '[CRITICAL] 该成品未配置 BOM 清单，无法拆解。' });
    }

    const moves = await prisma.goodsMove.findMany({
      where: {
        itemId: assembledItemId,
        OR: [
          { fromWarehouseId: warehouseId },
          { toWarehouseId: warehouseId }
        ]
      }
    });

    let stock = 0;
    for (const m of moves) {
      if (m.toWarehouseId === warehouseId) stock += m.qty;
      if (m.fromWarehouseId === warehouseId) stock -= m.qty;
    }

    if (stock < parseInt(quantity)) {
      return res.status(400).json({ 
        error: `[CRITICAL] 成品库存不足。需要 ${quantity}，库存 ${stock}。` 
      });
    }

    let totalCost = 0;
    for (const component of bom) {
      totalCost += component.componentItem.cost * component.quantity * parseInt(quantity);
    }

    const result = await prisma.$transaction(async (tx) => {
      const productMove = await tx.goodsMove.create({
        data: {
          itemId: assembledItemId,
          qty: parseInt(quantity),
          type: 'OUT',
          fromWarehouseId: warehouseId,
          userId,
          remarks: `拆解消耗：${remarks || ''}`
        },
        include: {
          item: true
        }
      });

      const componentMoves = [];
      for (const component of bom) {
        const move = await tx.goodsMove.create({
          data: {
            itemId: component.componentItemId,
            qty: component.quantity * parseInt(quantity),
            type: 'IN',
            toWarehouseId: warehouseId,
            userId,
            remarks: `拆解还原：${remarks || ''}`
          },
          include: {
            item: true
          }
        });
        componentMoves.push(move);
      }

      const assemblyLog = await tx.assemblyLog.create({
        data: {
          type: 'DISASSEMBLE',
          assembledItemId,
          quantity: parseInt(quantity),
          totalCost: -totalCost,
          warehouseId,
          userId,
          remarks
        },
        include: {
          assembledItem: true,
          warehouse: true,
          user: { select: { username: true } }
        }
      });

      return { assemblyLog, componentMoves, productMove };
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[CRITICAL] 拆解操作失败：', error);
    return res.status(500).json({ error: error.message || '[CRITICAL] 拆解操作失败。' });
  }
});

app.get('/api/assembly/logs', authenticateToken, requirePermission('canAccessAssembly'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await prisma.assemblyLog.findMany({
      include: {
        assembledItem: true,
        warehouse: true,
        user: { select: { username: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    return res.json(logs);
  } catch (error) {
    console.error('[CRITICAL] 获取组装历史失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 获取组装历史失败。' });
  }
});

// 启动服务器
app.listen(PORT, async () => {
  console.log(`[OK] 后端服务已在 http://localhost:${PORT} 启动`);
  await seedDatabase();
});
