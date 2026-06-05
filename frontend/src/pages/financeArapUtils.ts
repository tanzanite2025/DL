import type { Counterparty, FinancialBill } from '../types';

export type BillType = 'RECEIVABLE' | 'PAYABLE';

export interface BillSummary {
  currencyId: string;
  symbol: string;
  total: number;
  paid: number;
  pending: number;
}

export const filterBillsByType = (items: FinancialBill[], type: BillType) => {
  return items.filter((bill) => bill.type === type);
};

export const getBillCounterpartyName = (bill: FinancialBill) => bill.counterpartyNameSnapshot;

export const getBillCounterpartiesForType = (
  counterparties: Counterparty[],
  type: BillType,
) => {
  return counterparties.filter((counterparty) => {
    if (counterparty.roleType === 'BOTH') return true;
    return type === 'RECEIVABLE'
      ? counterparty.roleType === 'CUSTOMER'
      : counterparty.roleType === 'SUPPLIER';
  });
};

export const buildBillSummaries = (items: FinancialBill[]): BillSummary[] => {
  const summaries = new Map<string, BillSummary>();

  items.forEach((bill) => {
    const currencyId = bill.currencyId || 'unknown';
    const pending = bill.amount - bill.paidAmount;
    const symbol = bill.currency?.symbol || '';
    const existing = summaries.get(currencyId);

    if (existing) {
      existing.total += bill.amount;
      existing.paid += bill.paidAmount;
      existing.pending += pending;
      if (!existing.symbol && symbol) {
        existing.symbol = symbol;
      }
      return;
    }

    summaries.set(currencyId, {
      currencyId,
      symbol,
      total: bill.amount,
      paid: bill.paidAmount,
      pending,
    });
  });

  return Array.from(summaries.values());
};
