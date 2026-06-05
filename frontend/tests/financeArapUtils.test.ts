import test from 'node:test';
import assert from 'node:assert/strict';

import type { FinancialBill } from '../src/types/index.ts';
import {
  buildBillSummaries,
  filterBillsByType,
  getBillCounterpartyName,
} from '../src/pages/financeArapUtils.ts';

const sampleBills: FinancialBill[] = [
  {
    id: 'r-1',
    type: 'RECEIVABLE',
    amount: 100,
    currencyId: 'usd',
    currency: { id: 'usd', code: 'USD', name: 'US Dollar', symbol: '$', isDefault: false },
    paidAmount: 40,
    status: 'PARTIAL',
    counterpartyId: 'cp-alpha',
    counterpartyNameSnapshot: 'Alpha',
    description: 'Invoice A',
    dueDate: '2026-06-20',
    createdAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'p-1',
    type: 'PAYABLE',
    amount: 80,
    currencyId: 'usd',
    currency: { id: 'usd', code: 'USD', name: 'US Dollar', symbol: '$', isDefault: false },
    paidAmount: 20,
    status: 'PARTIAL',
    counterpartyId: 'cp-beta',
    counterpartyNameSnapshot: 'Beta',
    description: 'Invoice B',
    dueDate: '2026-06-22',
    createdAt: '2026-06-02T00:00:00.000Z',
  },
  {
    id: 'r-2',
    type: 'RECEIVABLE',
    amount: 50,
    currencyId: 'eur',
    currency: { id: 'eur', code: 'EUR', name: 'Euro', symbol: 'EUR', isDefault: false },
    paidAmount: 0,
    status: 'UNPAID',
    counterpartyId: 'cp-gamma',
    counterpartyNameSnapshot: 'Gamma',
    description: 'Invoice C',
    dueDate: '2026-06-25',
    createdAt: '2026-06-03T00:00:00.000Z',
  },
];

test('filterBillsByType keeps only bills of the requested type', () => {
  const receivables = filterBillsByType(sampleBills, 'RECEIVABLE');

  assert.deepEqual(
    receivables.map((bill) => bill.id),
    ['r-1', 'r-2'],
  );
});

test('buildBillSummaries groups bills by currency and totals amounts', () => {
  const summaries = buildBillSummaries(sampleBills);

  assert.deepEqual(summaries, [
    {
      currencyId: 'usd',
      symbol: '$',
      total: 180,
      paid: 60,
      pending: 120,
    },
    {
      currencyId: 'eur',
      symbol: 'EUR',
      total: 50,
      paid: 0,
      pending: 50,
    },
  ]);
});

test('buildBillSummaries backfills a missing symbol from later bills in the same currency', () => {
  const summaries = buildBillSummaries([
    {
      id: 'missing-symbol',
      type: 'RECEIVABLE',
      amount: 10,
      currencyId: 'cny',
      paidAmount: 0,
      status: 'UNPAID',
      counterpartyId: 'cp-delta',
      counterpartyNameSnapshot: 'Delta',
      description: null,
      dueDate: '2026-06-18',
      createdAt: '2026-06-04T00:00:00.000Z',
    },
    {
      id: 'with-symbol',
      type: 'RECEIVABLE',
      amount: 15,
      currencyId: 'cny',
      currency: { id: 'cny', code: 'CNY', name: 'Chinese Yuan', symbol: '¥', isDefault: true },
      paidAmount: 5,
      status: 'PARTIAL',
      counterpartyId: 'cp-delta',
      counterpartyNameSnapshot: 'Delta',
      description: null,
      dueDate: '2026-06-19',
      createdAt: '2026-06-05T00:00:00.000Z',
    },
  ]);

  assert.equal(summaries[0]?.symbol, '¥');
});

test('getBillCounterpartyName reads the persisted counterparty snapshot', () => {
  assert.equal(getBillCounterpartyName(sampleBills[0]), 'Alpha');
});
