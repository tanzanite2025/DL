import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

// 应收应付账款
router.get('/finance', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const bills = await prisma.financialBill.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json(bills);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 无法拉取应收应付账单。' });
  }
});

router.post('/finance', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
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

router.put('/finance/:id/pay', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
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

router.delete('/finance/:id', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.financialBill.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 删除账单失败。' });
  }
});

// 收款账户
router.get('/payment-accounts', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const accounts = await prisma.paymentAccount.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return res.json(accounts);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 无法拉取收付款账户列表。' });
  }
});

router.post('/payment-accounts', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
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

router.put('/payment-accounts/:id', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
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

router.delete('/payment-accounts/:id', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.paymentAccount.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 删除收付款账户失败。' });
  }
});

// 货币管理
router.get('/currencies', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currencies = await prisma.currency.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return res.json(currencies);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 无法拉取货币列表。' });
  }
});

router.post('/currencies', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
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

router.put('/currencies/:id', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
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

router.delete('/currencies/:id', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
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

export default router;
