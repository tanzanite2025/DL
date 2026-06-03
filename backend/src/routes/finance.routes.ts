import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

// 应收应付账款
router.get('/finance', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const bills = await prisma.financialBill.findMany({
      include: { currency: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(bills);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 无法拉取应收应付账单。' });
  }
});

router.post('/finance', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  const { type, amount, partner, description, dueDate, currencyId } = req.body;
  if (!type || !amount || !partner || !dueDate || !currencyId) {
    return res.status(400).json({ error: '[CRITICAL] 账单录入缺少核心字段（收付类型、金额、往来单位、到期日、币种）。' });
  }
  try {
    const newBill = await prisma.financialBill.create({
      data: {
        type,
        amount: parseFloat(amount),
        currencyId,
        partner,
        description,
        dueDate: new Date(dueDate),
        status: 'UNPAID',
        paidAmount: 0.0,
      },
      include: { currency: true }
    });
    return res.json(newBill);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 录入账单失败。' });
  }
});

router.put('/finance/:id/pay', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { payAmount, accountId } = req.body;

  if (!payAmount || parseFloat(payAmount) <= 0) {
    return res.status(400).json({ error: '[CRITICAL] 核销金额必须大于零。' });
  }
  if (!accountId) {
    return res.status(400).json({ error: '[CRITICAL] 必须选择用于核销的收款/付款账户。' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const bill = await tx.financialBill.findUnique({ where: { id } });
      if (!bill) {
        throw new Error('[CRITICAL] 未找到对应账单。');
      }

      const account = await tx.paymentAccount.findUnique({ where: { id: accountId } });
      if (!account) {
        throw new Error('[CRITICAL] 未找到选择的收付款账户。');
      }

      if (bill.currencyId !== account.currencyId) {
        throw new Error('[CRITICAL] 账户币种与账单币种不一致，无法核销。');
      }

      const payment = parseFloat(payAmount);
      const newPaidAmount = bill.paidAmount + payment;
      if (newPaidAmount > bill.amount) {
        throw new Error(`[CRITICAL] 累计核销金额超过账单总金额。账单金额: ${bill.amount}, 当前已付: ${bill.paidAmount}`);
      }

      const status = newPaidAmount === bill.amount ? 'PAID' : 'PARTIAL';

      // 更新账单
      const updatedBill = await tx.financialBill.update({
        where: { id },
        data: { paidAmount: newPaidAmount, status },
        include: { currency: true }
      });

      // 计算账户余额变动
      // 如果是 RECEIVABLE(应收)，则账户余额增加 IN
      // 如果是 PAYABLE(应付)，则账户余额减少 OUT
      const isReceivable = bill.type === 'RECEIVABLE';
      const balanceChange = isReceivable ? payment : -payment;
      const newBalance = account.balance + balanceChange;

      // 更新账户余额
      await tx.paymentAccount.update({
        where: { id: account.id },
        data: { balance: newBalance }
      });

      // 记录流水
      await tx.accountTransaction.create({
        data: {
          accountId: account.id,
          type: isReceivable ? 'IN' : 'OUT',
          amount: payment,
          balanceAfter: newBalance,
          referenceType: 'BILL_PAYMENT',
          referenceId: bill.id,
          description: `核销${isReceivable ? '应收' : '应付'}账单`
        }
      });

      return updatedBill;
    });

    return res.json(result);
  } catch (error: any) {
    if (error.message && error.message.startsWith('[CRITICAL]')) {
      return res.status(400).json({ error: error.message });
    }
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
      include: { currency: true },
      orderBy: { createdAt: 'asc' },
    });
    return res.json(accounts);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 无法拉取收付款账户列表。' });
  }
});

router.post('/payment-accounts', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  const { name, type, accountNo, holder, balance, currencyId } = req.body;
  if (!name || !type || !accountNo || !currencyId) {
    return res.status(400).json({ error: '[CRITICAL] 账户名称、类型、卡号及币种不可为空。' });
  }
  const initialBalance = parseFloat(balance) || 0;
  
  try {
    const result = await prisma.$transaction(async (tx) => {
      const newAccount = await tx.paymentAccount.create({
        data: { name, type, accountNo, holder, balance: initialBalance, currencyId },
        include: { currency: true }
      });

      if (initialBalance !== 0) {
        await tx.accountTransaction.create({
          data: {
            accountId: newAccount.id,
            type: initialBalance > 0 ? 'IN' : 'OUT',
            amount: Math.abs(initialBalance),
            balanceAfter: initialBalance,
            referenceType: 'INITIAL',
            description: '期初资金注入'
          }
        });
      }
      return newAccount;
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: '[CRITICAL] 创建收付款账户失败。' });
  }
});

router.put('/payment-accounts/:id', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, type, accountNo, holder, currencyId } = req.body;
  try {
    const updated = await prisma.paymentAccount.update({
      where: { id },
      data: { name, type, accountNo, holder, currencyId },
      include: { currency: true }
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
