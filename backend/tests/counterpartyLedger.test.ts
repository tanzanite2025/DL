import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCounterpartyLedger } from '../src/lib/counterpartyLedger.js';

test('buildCounterpartyLedger returns AR AP and net position totals', () => {
  const ledger = buildCounterpartyLedger({
    counterparty: {
      id: 'cp-1',
      code: 'CP-0001',
      name: 'Acme',
      roleType: 'BOTH',
      isActive: true,
    },
    bills: [
      { id: 'b1', type: 'RECEIVABLE', amount: 100, paidAmount: 20 },
      { id: 'b2', type: 'PAYABLE', amount: 60, paidAmount: 10 },
    ],
    salesOrders: [{ id: 'so-1', orderNo: 'SO-001' }],
    purchaseOrders: [{ id: 'po-1', orderNo: 'PO-001' }],
  });

  assert.equal(ledger.receivable.total, 100);
  assert.equal(ledger.receivable.pending, 80);
  assert.equal(ledger.payable.total, 60);
  assert.equal(ledger.payable.pending, 50);
  assert.equal(ledger.netPosition, 40);
});
