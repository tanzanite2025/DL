import test from 'node:test';
import assert from 'node:assert/strict';

import { buildManualBillDraft, buildSalesOrderBillDraft } from '../src/lib/counterpartyDocuments.js';

test('buildManualBillDraft stores counterparty id and snapshot', () => {
  const dueDate = new Date('2026-06-20T00:00:00.000Z');
  const result = buildManualBillDraft({
    type: 'RECEIVABLE',
    amount: 250,
    currencyId: 'cny-id',
    description: 'Manual invoice',
    dueDate,
    counterparty: { id: 'cp-1', name: 'Acme' },
  });

  assert.deepEqual(result, {
    type: 'RECEIVABLE',
    amount: 250,
    currencyId: 'cny-id',
    paidAmount: 0,
    status: 'UNPAID',
    counterpartyId: 'cp-1',
    counterpartyNameSnapshot: 'Acme',
    sourceType: 'MANUAL',
    sourceId: null,
    description: 'Manual invoice',
    dueDate,
  });
});

test('buildSalesOrderBillDraft stores sales order source metadata', () => {
  const dueDate = new Date('2026-06-21T00:00:00.000Z');
  const result = buildSalesOrderBillDraft({
    amount: 300,
    currencyId: 'usd-id',
    dueDate,
    salesOrderId: 'so-77',
    counterparty: { id: 'cp-9', name: 'Northwind' },
    description: 'Sales order receivable',
  });

  assert.equal(result.counterpartyId, 'cp-9');
  assert.equal(result.counterpartyNameSnapshot, 'Northwind');
  assert.equal(result.sourceType, 'SALES_ORDER');
  assert.equal(result.sourceId, 'so-77');
});
