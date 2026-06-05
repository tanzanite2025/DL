import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  allowsCounterpartyCapability,
  type CounterpartyRoleType,
} from '../lib/counterpartyRules.js';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();

async function resolveBillCounterparty(input: {
  type: string;
  counterpartyId: string;
}) {
  const existing = await prisma.counterparty.findUnique({ where: { id: input.counterpartyId } });
  const requiredCapability = input.type === 'RECEIVABLE' ? 'customer' : 'supplier';
  if (
    !existing ||
    !allowsCounterpartyCapability(
      existing.roleType as CounterpartyRoleType,
      requiredCapability,
    )
  ) {
    throw new Error('[CRITICAL] Selected counterparty is not valid for this bill type.');
  }

  return existing;
}

router.get('/finance', authenticateToken, requirePermission('canAccessFinance'), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const bills = await prisma.financialBill.findMany({
      include: { currency: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(bills);
  } catch (error) {
    console.error('[CRITICAL] Failed to fetch finance bills:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to fetch finance bills.' });
  }
});

router.post('/finance', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  const { type, amount, counterpartyId, description, dueDate, currencyId } = req.body;
  if (!type || !amount || !counterpartyId || !dueDate || !currencyId) {
    return res.status(400).json({ error: '[CRITICAL] Missing required bill fields.' });
  }

  try {
    const counterparty = await resolveBillCounterparty({ type, counterpartyId });
    const newBill = await prisma.financialBill.create({
      data: {
        type,
        amount: parseFloat(amount),
        currencyId,
        counterpartyId: counterparty.id,
        counterpartyNameSnapshot: counterparty.name,
        sourceType: 'MANUAL',
        description,
        dueDate: new Date(dueDate),
        status: 'UNPAID',
        paidAmount: 0.0,
      },
      include: { currency: true },
    });
    return res.json(newBill);
  } catch (error) {
    console.error('[CRITICAL] Failed to create finance bill:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to create finance bill.' });
  }
});

router.put('/finance/:id/pay', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { payAmount, accountId } = req.body;

  if (!payAmount || parseFloat(payAmount) <= 0) {
    return res.status(400).json({ error: '[CRITICAL] Payment amount must be positive.' });
  }
  if (!accountId) {
    return res.status(400).json({ error: '[CRITICAL] Payment account is required.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const bill = await tx.financialBill.findUnique({ where: { id } });
      if (!bill) {
        throw new Error('[CRITICAL] Bill not found.');
      }

      const account = await tx.paymentAccount.findUnique({ where: { id: accountId } });
      if (!account) {
        throw new Error('[CRITICAL] Payment account not found.');
      }

      if (bill.currencyId !== account.currencyId) {
        throw new Error('[CRITICAL] Account currency does not match bill currency.');
      }

      const payment = parseFloat(payAmount);
      const newPaidAmount = bill.paidAmount + payment;
      if (newPaidAmount > bill.amount) {
        throw new Error('[CRITICAL] Payment amount exceeds remaining bill amount.');
      }

      const status = newPaidAmount === bill.amount ? 'PAID' : 'PARTIAL';
      const updatedBill = await tx.financialBill.update({
        where: { id },
        data: { paidAmount: newPaidAmount, status },
        include: { currency: true },
      });

      const isReceivable = bill.type === 'RECEIVABLE';
      const balanceChange = isReceivable ? payment : -payment;
      const newBalance = account.balance + balanceChange;

      await tx.paymentAccount.update({
        where: { id: account.id },
        data: { balance: newBalance },
      });

      await tx.accountTransaction.create({
        data: {
          accountId: account.id,
          type: isReceivable ? 'IN' : 'OUT',
          amount: payment,
          balanceAfter: newBalance,
          referenceType: 'BILL_PAYMENT',
          referenceId: bill.id,
          description: `Bill payment for ${isReceivable ? 'receivable' : 'payable'} bill`,
        },
      });

      return updatedBill;
    });

    return res.json(result);
  } catch (error: any) {
    if (error.message && error.message.startsWith('[CRITICAL]')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('[CRITICAL] Failed to pay finance bill:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to pay finance bill.' });
  }
});

router.delete('/finance/:id', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.financialBill.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error('[CRITICAL] Failed to delete finance bill:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to delete finance bill.' });
  }
});

router.get('/payment-accounts', authenticateToken, requirePermission('canAccessFinance'), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const accounts = await prisma.paymentAccount.findMany({
      include: { currency: true },
      orderBy: { createdAt: 'asc' },
    });
    return res.json(accounts);
  } catch (error) {
    console.error('[CRITICAL] Failed to fetch payment accounts:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to fetch payment accounts.' });
  }
});

router.post('/payment-accounts', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  const { name, type, accountNo, holder, balance, currencyId } = req.body;
  if (!name || !type || !accountNo || !currencyId) {
    return res.status(400).json({ error: '[CRITICAL] Account name, type, account number, and currency are required.' });
  }
  const initialBalance = parseFloat(balance) || 0;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const newAccount = await tx.paymentAccount.create({
        data: { name, type, accountNo, holder, balance: initialBalance, currencyId },
        include: { currency: true },
      });

      if (initialBalance !== 0) {
        await tx.accountTransaction.create({
          data: {
            accountId: newAccount.id,
            type: initialBalance > 0 ? 'IN' : 'OUT',
            amount: Math.abs(initialBalance),
            balanceAfter: initialBalance,
            referenceType: 'INITIAL',
            description: 'Opening balance',
          },
        });
      }
      return newAccount;
    });
    return res.json(result);
  } catch (error) {
    console.error('[CRITICAL] Failed to create payment account:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to create payment account.' });
  }
});

router.put('/payment-accounts/:id', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, type, accountNo, holder, currencyId } = req.body;
  try {
    const updated = await prisma.paymentAccount.update({
      where: { id },
      data: { name, type, accountNo, holder, currencyId },
      include: { currency: true },
    });
    return res.json(updated);
  } catch (error) {
    console.error('[CRITICAL] Failed to update payment account:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to update payment account.' });
  }
});

router.delete('/payment-accounts/:id', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.paymentAccount.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error('[CRITICAL] Failed to delete payment account:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to delete payment account.' });
  }
});

router.get('/currencies', authenticateToken, requirePermission('canAccessFinance'), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const currencies = await prisma.currency.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return res.json(currencies);
  } catch (error) {
    console.error('[CRITICAL] Failed to fetch currencies:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to fetch currencies.' });
  }
});

router.post('/currencies', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  const { code, name, symbol, isDefault } = req.body;
  if (!code || !name || !symbol) {
    return res.status(400).json({ error: '[CRITICAL] Currency code, name, and symbol are required.' });
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
    console.error('[CRITICAL] Failed to create currency:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to create currency.' });
  }
});

router.put('/currencies/:id', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { code, name, symbol, isDefault } = req.body;
  if (!code || !name || !symbol) {
    return res.status(400).json({ error: '[CRITICAL] Currency code, name, and symbol are required.' });
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
    console.error('[CRITICAL] Failed to update currency:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to update currency.' });
  }
});

router.delete('/currencies/:id', authenticateToken, requirePermission('canAccessFinance'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const currency = await prisma.currency.findUnique({ where: { id } });
    if (!currency) {
      return res.status(404).json({ error: '[CRITICAL] Currency not found.' });
    }
    if (currency.isDefault) {
      return res.status(403).json({ error: '[CRITICAL] Default currency cannot be deleted.' });
    }
    await prisma.currency.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error('[CRITICAL] Failed to delete currency:', error);
    return res.status(500).json({ error: '[CRITICAL] Failed to delete currency.' });
  }
});

export default router;
