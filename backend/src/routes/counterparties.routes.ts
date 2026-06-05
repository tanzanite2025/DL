import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { buildCounterpartyLedger } from '../lib/counterpartyLedger.js';
import {
  assertCounterpartyRoleType,
  buildNextCounterpartyCode,
  canManageCounterparties,
  canReadCounterparties,
  normalizeCounterpartyName,
  type CounterpartyRoleType,
} from '../lib/counterpartyRules.js';
import { authenticateToken, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

async function getRequestRole(req: AuthenticatedRequest) {
  if (!req.user?.roleId) return null;
  return prisma.role.findUnique({ where: { id: req.user.roleId } });
}

function buildRoleFilter(role: string) {
  if (role === 'customer') return { in: ['CUSTOMER', 'BOTH'] };
  if (role === 'supplier') return { in: ['SUPPLIER', 'BOTH'] };
  return { in: ['CUSTOMER', 'SUPPLIER', 'BOTH'] };
}

async function assertCanRead(req: AuthenticatedRequest, res: Response) {
  const role = await getRequestRole(req);
  if (!role || !canReadCounterparties(role)) {
    res.status(403).json({ error: '[CRITICAL] Role cannot read counterparties.' });
    return false;
  }
  return true;
}

async function assertCanManage(req: AuthenticatedRequest, res: Response) {
  const role = await getRequestRole(req);
  if (!role || !canManageCounterparties(role)) {
    res.status(403).json({ error: '[CRITICAL] Role cannot manage counterparties.' });
    return false;
  }
  return true;
}

async function buildNextCode() {
  const counterparties = await prisma.counterparty.findMany({ select: { code: true } });
  return buildNextCounterpartyCode(counterparties.map((counterparty) => counterparty.code));
}

router.get('/counterparties', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!(await assertCanRead(req, res))) return;

  const role = String(req.query.role || 'both');
  const keyword = String(req.query.q || '').trim();

  try {
    const counterparties = await prisma.counterparty.findMany({
      where: {
        isActive: true,
        roleType: buildRoleFilter(role),
        ...(keyword
          ? {
              OR: [
                { name: { contains: keyword } },
                { code: { contains: keyword } },
                { normalizedName: { contains: normalizeCounterpartyName(keyword) } },
                { contactPerson: { contains: keyword } },
                { phone: { contains: keyword } },
                { email: { contains: keyword } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return res.json(counterparties);
  } catch (error) {
    console.error('[CRITICAL] Failed to fetch counterparties:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to fetch counterparties.' });
  }
});

router.post('/counterparties', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!(await assertCanManage(req, res))) return;

  const { name, roleType, contactPerson, phone, email, address, remarks, isActive } = req.body;
  if (!name || !roleType) {
    return res.status(400).json({ error: '[CRITICAL] Name and roleType are required.' });
  }

  try {
    assertCounterpartyRoleType(roleType);
    const normalizedName = normalizeCounterpartyName(name);
    const duplicate = await prisma.counterparty.findFirst({
      where: { OR: [{ name }, { normalizedName }] },
    });
    if (duplicate) {
      return res.status(400).json({ error: '[CRITICAL] Counterparty name already exists.' });
    }

    const created = await prisma.counterparty.create({
      data: {
        code: await buildNextCode(),
        name,
        normalizedName,
        roleType,
        contactPerson,
        phone,
        email,
        address,
        remarks,
        isActive: typeof isActive === 'boolean' ? isActive : true,
      },
    });

    return res.json(created);
  } catch (error) {
    if (error instanceof Error && error.message.includes('roleType')) {
      return res.status(400).json({ error: `[CRITICAL] ${error.message}` });
    }
    console.error('[CRITICAL] Failed to create counterparty:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to create counterparty.' });
  }
});

router.patch('/counterparties/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!(await assertCanManage(req, res))) return;

  const { id } = req.params;
  const { name, roleType, contactPerson, phone, email, address, remarks, isActive } = req.body;

  try {
    const existing = await prisma.counterparty.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: '[CRITICAL] Counterparty not found.' });
    }

    const data: {
      name?: string;
      normalizedName?: string;
      roleType?: CounterpartyRoleType;
      contactPerson?: string | null;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      remarks?: string | null;
      isActive?: boolean;
    } = {};

    if (name) {
      const normalizedName = normalizeCounterpartyName(name);
      const duplicate = await prisma.counterparty.findFirst({
        where: {
          OR: [{ name }, { normalizedName }],
          NOT: { id },
        },
      });
      if (duplicate) {
        return res.status(400).json({ error: '[CRITICAL] Counterparty name already exists.' });
      }
      data.name = name;
      data.normalizedName = normalizedName;
    }

    if (roleType) {
      assertCounterpartyRoleType(roleType);
      data.roleType = roleType;
    }
    if (typeof contactPerson !== 'undefined') data.contactPerson = contactPerson;
    if (typeof phone !== 'undefined') data.phone = phone;
    if (typeof email !== 'undefined') data.email = email;
    if (typeof address !== 'undefined') data.address = address;
    if (typeof remarks !== 'undefined') data.remarks = remarks;
    if (typeof isActive === 'boolean') data.isActive = isActive;

    const updated = await prisma.counterparty.update({
      where: { id },
      data,
    });

    return res.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message.includes('roleType')) {
      return res.status(400).json({ error: `[CRITICAL] ${error.message}` });
    }
    console.error('[CRITICAL] Failed to update counterparty:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to update counterparty.' });
  }
});

router.delete('/counterparties/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!(await assertCanManage(req, res))) return;

  const { id } = req.params;

  try {
    const [salesOrders, purchaseOrders, afterSalesCases, financialBills] = await Promise.all([
      prisma.salesOrder.count({ where: { counterpartyId: id } }),
      prisma.purchaseOrder.count({ where: { counterpartyId: id } }),
      prisma.afterSalesCase.count({ where: { counterpartyId: id } }),
      prisma.financialBill.count({ where: { counterpartyId: id } }),
    ]);

    const referenceCount = salesOrders + purchaseOrders + afterSalesCases + financialBills;
    if (referenceCount > 0) {
      const deactivated = await prisma.counterparty.update({
        where: { id },
        data: { isActive: false },
      });
      return res.json({ success: true, deactivated: true, counterparty: deactivated });
    }

    await prisma.counterparty.delete({ where: { id } });
    return res.json({ success: true, deleted: true });
  } catch (error) {
    console.error('[CRITICAL] Failed to delete counterparty:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to delete counterparty.' });
  }
});

router.get('/counterparties/:id/ledger', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!(await assertCanRead(req, res))) return;

  const { id } = req.params;

  try {
    const counterparty = await prisma.counterparty.findUnique({ where: { id } });
    if (!counterparty) {
      return res.status(404).json({ error: '[CRITICAL] Counterparty not found.' });
    }

    const [bills, salesOrders, purchaseOrders] = await Promise.all([
      prisma.financialBill.findMany({
        where: { counterpartyId: id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.salesOrder.findMany({
        where: { counterpartyId: id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.purchaseOrder.findMany({
        where: { counterpartyId: id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return res.json(
      buildCounterpartyLedger({
        counterparty: {
          id: counterparty.id,
          code: counterparty.code,
          name: counterparty.name,
          roleType: counterparty.roleType as CounterpartyRoleType,
          isActive: counterparty.isActive,
        },
        bills: bills.map((bill) => ({
          id: bill.id,
          type: bill.type as 'RECEIVABLE' | 'PAYABLE',
          amount: bill.amount,
          paidAmount: bill.paidAmount,
        })),
        salesOrders: salesOrders.map((order) => ({ id: order.id, orderNo: order.orderNo })),
        purchaseOrders: purchaseOrders.map((order) => ({ id: order.id, orderNo: order.orderNo })),
      }),
    );
  } catch (error) {
    console.error('[CRITICAL] Failed to fetch counterparty ledger:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to fetch counterparty ledger.' });
  }
});

export default router;
